//! Live PostgreSQL introspection.
//!
//! Reads only PostgreSQL catalog/information_schema metadata. Never touches
//! application data. Output is assembled into a deterministic [`Snapshot`].

use crate::snapshot::{
    ColumnSnapshot, DatabaseInfo, ForeignKeySnapshot, IndexSnapshot, SchemaSnapshot, Snapshot,
    TableSnapshot, FORMAT_VERSION,
};
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use std::collections::BTreeMap;

pub async fn introspect(db: &DatabaseConnection, schemas: &[String]) -> Result<Snapshot, String> {
    for schema in schemas {
        if !is_valid_identifier(schema) {
            return Err(format!("invalid schema name: {schema}"));
        }
    }
    if schemas.is_empty() {
        return Err("no schemas requested".to_string());
    }

    let schema_list = schemas
        .iter()
        .map(|s| format!("'{s}'"))
        .collect::<Vec<_>>()
        .join(", ");

    let database = fetch_database_info(db).await?;
    let mut snapshot = Snapshot {
        format_version: FORMAT_VERSION,
        database,
        schemas: BTreeMap::new(),
    };
    for schema in schemas {
        snapshot
            .schemas
            .insert(schema.clone(), SchemaSnapshot::default());
    }

    fetch_columns(db, &schema_list, &mut snapshot).await?;
    fetch_constraints(db, &schema_list, &mut snapshot).await?;
    fetch_indexes(db, &schema_list, &mut snapshot).await?;

    Ok(snapshot)
}

fn is_valid_identifier(value: &str) -> bool {
    let mut chars = value.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn table_mut<'a>(
    snapshot: &'a mut Snapshot,
    schema: &str,
    table: &str,
) -> Result<&'a mut TableSnapshot, String> {
    let schema_snapshot = snapshot
        .schemas
        .get_mut(schema)
        .ok_or_else(|| format!("schema {schema} missing from snapshot"))?;
    Ok(schema_snapshot.tables.entry(table.to_string()).or_default())
}

async fn fetch_database_info(db: &DatabaseConnection) -> Result<DatabaseInfo, String> {
    let sql = "SELECT current_database() AS name, current_setting('server_version') AS server_version";
    let row = db
        .query_one(Statement::from_string(DbBackend::Postgres, sql))
        .await
        .map_err(|e| format!("failed to read database info: {e}"))?
        .ok_or_else(|| "database info query returned no rows".to_string())?;

    Ok(DatabaseInfo {
        name: row.try_get("", "name").map_err(|e| e.to_string())?,
        server_version: row.try_get("", "server_version").map_err(|e| e.to_string())?,
    })
}

async fn fetch_columns(
    db: &DatabaseConnection,
    schema_list: &str,
    snapshot: &mut Snapshot,
) -> Result<(), String> {
    let sql = format!(
        r#"
        SELECT
            c.table_schema,
            c.table_name,
            c.column_name,
            c.ordinal_position,
            (c.is_nullable = 'YES') AS nullable,
            c.column_default,
            format_type(a.atttypid, a.atttypmod) AS data_type
        FROM information_schema.columns c
        JOIN pg_catalog.pg_class cl
            ON cl.relname = c.table_name
           AND cl.relkind IN ('r', 'p')
        JOIN pg_catalog.pg_namespace n
            ON n.oid = cl.relnamespace
           AND n.nspname = c.table_schema
        JOIN pg_catalog.pg_attribute a
            ON a.attrelid = cl.oid
           AND a.attname = c.column_name
        WHERE c.table_schema IN ({schema_list})
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY c.table_schema, c.table_name, c.ordinal_position
        "#
    );

    let rows = db
        .query_all(Statement::from_string(DbBackend::Postgres, sql))
        .await
        .map_err(|e| format!("failed to read columns: {e}"))?;

    for row in rows {
        let schema: String = row.try_get("", "table_schema").map_err(|e| e.to_string())?;
        let table: String = row.try_get("", "table_name").map_err(|e| e.to_string())?;
        let column: String = row.try_get("", "column_name").map_err(|e| e.to_string())?;
        let ordinal: i32 = row.try_get("", "ordinal_position").map_err(|e| e.to_string())?;
        let nullable: bool = row.try_get("", "nullable").map_err(|e| e.to_string())?;
        let default: Option<String> = row.try_get("", "column_default").map_err(|e| e.to_string())?;
        let data_type: String = row.try_get("", "data_type").map_err(|e| e.to_string())?;

        table_mut(snapshot, &schema, &table)?.columns.insert(
            column,
            ColumnSnapshot {
                ordinal,
                data_type,
                nullable,
                default,
            },
        );
    }
    Ok(())
}

async fn fetch_constraints(
    db: &DatabaseConnection,
    schema_list: &str,
    snapshot: &mut Snapshot,
) -> Result<(), String> {
    let sql = format!(
        r#"
        SELECT
            n.nspname AS table_schema,
            cl.relname AS table_name,
            con.conname AS constraint_name,
            con.contype::text AS constraint_type,
            pg_get_constraintdef(con.oid) AS definition,
            (
                SELECT string_agg(att.attname, E'\x1f' ORDER BY k.ord)
                FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute att
                  ON att.attrelid = con.conrelid
                 AND att.attnum = k.attnum
            ) AS columns,
            CASE WHEN con.contype = 'f' THEN (
                SELECT nf.nspname
                FROM pg_class cf
                JOIN pg_namespace nf ON nf.oid = cf.relnamespace
                WHERE cf.oid = con.confrelid
            ) END AS ref_schema,
            CASE WHEN con.contype = 'f' THEN (
                SELECT cf.relname FROM pg_class cf WHERE cf.oid = con.confrelid
            ) END AS ref_table,
            CASE WHEN con.contype = 'f' THEN (
                SELECT string_agg(attf.attname, E'\x1f' ORDER BY k.ord)
                FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute attf
                  ON attf.attrelid = con.confrelid
                 AND attf.attnum = k.attnum
            ) END AS ref_columns,
            con.confupdtype::text AS on_update,
            con.confdeltype::text AS on_delete
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname IN ({schema_list})
          AND con.contype IN ('p', 'u', 'f', 'c')
        ORDER BY n.nspname, cl.relname, con.conname
        "#
    );

    let rows = db
        .query_all(Statement::from_string(DbBackend::Postgres, sql))
        .await
        .map_err(|e| format!("failed to read constraints: {e}"))?;

    for row in rows {
        let schema: String = row.try_get("", "table_schema").map_err(|e| e.to_string())?;
        let table: String = row.try_get("", "table_name").map_err(|e| e.to_string())?;
        let name: String = row.try_get("", "constraint_name").map_err(|e| e.to_string())?;
        let ctype: String = row.try_get("", "constraint_type").map_err(|e| e.to_string())?;
        let definition: String = row.try_get("", "definition").map_err(|e| e.to_string())?;
        let columns: Option<String> = row.try_get("", "columns").map_err(|e| e.to_string())?;
        let columns = split_list(columns);

        let target = table_mut(snapshot, &schema, &table)?;
        match ctype.as_str() {
            "p" => target.primary_key = columns,
            "u" => {
                target.unique_constraints.insert(name, columns);
            }
            "c" => {
                target.check_constraints.insert(name, definition);
            }
            "f" => {
                let ref_schema: Option<String> =
                    row.try_get("", "ref_schema").map_err(|e| e.to_string())?;
                let ref_table: Option<String> =
                    row.try_get("", "ref_table").map_err(|e| e.to_string())?;
                let ref_columns: Option<String> =
                    row.try_get("", "ref_columns").map_err(|e| e.to_string())?;
                let on_update: Option<String> =
                    row.try_get("", "on_update").map_err(|e| e.to_string())?;
                let on_delete: Option<String> =
                    row.try_get("", "on_delete").map_err(|e| e.to_string())?;
                target.foreign_keys.insert(
                    name,
                    ForeignKeySnapshot {
                        columns,
                        references_schema: ref_schema.unwrap_or_else(|| "public".to_string()),
                        references_table: ref_table.unwrap_or_default(),
                        references_columns: split_list(ref_columns),
                        on_update: action_name(&on_update.unwrap_or_default()),
                        on_delete: action_name(&on_delete.unwrap_or_default()),
                    },
                );
            }
            _ => {}
        }
    }
    Ok(())
}

async fn fetch_indexes(
    db: &DatabaseConnection,
    schema_list: &str,
    snapshot: &mut Snapshot,
) -> Result<(), String> {
    let sql = format!(
        r#"
        SELECT
            n.nspname AS table_schema,
            cl.relname AS table_name,
            ic.relname AS index_name,
            i.indisunique AS is_unique,
            i.indisprimary AS is_primary,
            am.amname AS method,
            pg_get_expr(i.indpred, i.indrelid) AS predicate,
            pg_get_indexdef(i.indexrelid) AS definition,
            (
                SELECT string_agg(att.attname, E'\x1f' ORDER BY k.ord)
                FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute att
                  ON att.attrelid = i.indrelid
                 AND att.attnum = k.attnum
                WHERE k.attnum > 0
            ) AS columns
        FROM pg_index i
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_class cl ON cl.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        JOIN pg_am am ON am.oid = ic.relam
        WHERE n.nspname IN ({schema_list})
        ORDER BY n.nspname, cl.relname, ic.relname
        "#
    );

    let rows = db
        .query_all(Statement::from_string(DbBackend::Postgres, sql))
        .await
        .map_err(|e| format!("failed to read indexes: {e}"))?;

    for row in rows {
        let schema: String = row.try_get("", "table_schema").map_err(|e| e.to_string())?;
        let table: String = row.try_get("", "table_name").map_err(|e| e.to_string())?;
        let name: String = row.try_get("", "index_name").map_err(|e| e.to_string())?;
        let unique: bool = row.try_get("", "is_unique").map_err(|e| e.to_string())?;
        let primary: bool = row.try_get("", "is_primary").map_err(|e| e.to_string())?;
        let method: String = row.try_get("", "method").map_err(|e| e.to_string())?;
        let predicate: Option<String> = row.try_get("", "predicate").map_err(|e| e.to_string())?;
        let definition: String = row.try_get("", "definition").map_err(|e| e.to_string())?;
        let columns: Option<String> = row.try_get("", "columns").map_err(|e| e.to_string())?;

        table_mut(snapshot, &schema, &table)?.indexes.insert(
            name,
            IndexSnapshot {
                unique,
                primary,
                method,
                columns: split_list(columns),
                predicate,
                definition,
            },
        );
    }
    Ok(())
}

fn split_list(value: Option<String>) -> Vec<String> {
    value
        .unwrap_or_default()
        .split('\u{1f}')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

fn action_name(code: &str) -> String {
    match code {
        "a" => "NO ACTION",
        "r" => "RESTRICT",
        "c" => "CASCADE",
        "n" => "SET NULL",
        "d" => "SET DEFAULT",
        _ => "NO ACTION",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_identifiers() {
        assert!(is_valid_identifier("public"));
        assert!(is_valid_identifier("rjagro_2"));
        assert!(!is_valid_identifier("public; DROP TABLE users"));
        assert!(!is_valid_identifier("2fast"));
    }

    #[test]
    fn maps_fk_actions() {
        assert_eq!(action_name("c"), "CASCADE");
        assert_eq!(action_name("n"), "SET NULL");
        assert_eq!(action_name("r"), "RESTRICT");
        assert_eq!(action_name("a"), "NO ACTION");
    }

    #[test]
    fn splits_ordered_lists() {
        assert_eq!(
            split_list(Some("a\u{1f}b".to_string())),
            vec!["a".to_string(), "b".to_string()]
        );
        assert!(split_list(None).is_empty());
    }
}

/// Live-database tests. Run with:
/// `cargo test --bin db-knowledge -- --ignored`
#[cfg(test)]
mod live_tests {
    use super::*;
    use sea_orm::Database;

    async fn live() -> Snapshot {
        let url = crate::db::database_url(std::path::Path::new(".")).expect("DATABASE_URL");
        let conn = Database::connect(&url).await.expect("connect");
        introspect(&conn, &["public".to_string()])
            .await
            .expect("introspect")
    }

    #[tokio::test]
    #[ignore]
    async fn finds_core_tables_with_keys_and_indexes() {
        let snapshot = live().await;
        assert!(
            snapshot.table_count() >= 30,
            "expected at least 30 tables, got {}",
            snapshot.table_count()
        );

        let batch_sales = snapshot
            .table("public", "batch_sales")
            .expect("batch_sales missing from live introspection");
        assert_eq!(batch_sales.primary_key, vec!["id".to_string()]);
        assert!(
            batch_sales
                .foreign_keys
                .values()
                .any(|fk| fk.references_table == "batches"),
            "batch_sales should reference batches"
        );
        assert!(
            !batch_sales.indexes.is_empty(),
            "batch_sales should have indexes"
        );
        assert!(batch_sales.columns.contains_key("payment_type"));
    }

    #[tokio::test]
    #[ignore]
    async fn snapshot_is_deterministic() {
        let first = live().await;
        let second = live().await;
        assert_eq!(
            serde_json::to_string(&first).unwrap(),
            serde_json::to_string(&second).unwrap(),
            "two introspections of the same schema must be identical"
        );
    }
}
