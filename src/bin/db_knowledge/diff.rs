//! Snapshot diffing.
//!
//! Compares two schema snapshots and produces a small, deterministic list of
//! changes that is easy for an agent (or a human) to consume.

use crate::snapshot::{Snapshot, TableSnapshot};
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeKind {
    SchemaAdded,
    SchemaRemoved,
    TableAdded,
    TableRemoved,
    TableRenamed,
    ColumnAdded,
    ColumnRemoved,
    ColumnTypeChanged,
    ColumnNullabilityChanged,
    ColumnDefaultChanged,
    PrimaryKeyChanged,
    ForeignKeyAdded,
    ForeignKeyRemoved,
    ForeignKeyChanged,
    UniqueConstraintAdded,
    UniqueConstraintRemoved,
    UniqueConstraintChanged,
    CheckConstraintAdded,
    CheckConstraintRemoved,
    CheckConstraintChanged,
    IndexAdded,
    IndexRemoved,
    IndexChanged,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Change {
    pub kind: ChangeKind,
    pub schema: String,
    pub table: String,
    pub object: String,
    pub detail: Option<String>,
}

impl Change {
    fn new(kind: ChangeKind, schema: &str, table: &str, object: &str) -> Self {
        Self {
            kind,
            schema: schema.to_string(),
            table: table.to_string(),
            object: object.to_string(),
            detail: None,
        }
    }

    fn with_detail(mut self, detail: String) -> Self {
        self.detail = Some(detail);
        self
    }
}

pub fn diff_snapshots(old: &Snapshot, new: &Snapshot) -> Vec<Change> {
    let mut changes = Vec::new();

    let old_schemas = &old.schemas;
    let new_schemas = &new.schemas;

    for schema in old_schemas.keys() {
        if !new_schemas.contains_key(schema) {
            changes.push(Change::new(ChangeKind::SchemaRemoved, schema, "", schema));
        }
    }
    for schema in new_schemas.keys() {
        if !old_schemas.contains_key(schema) {
            changes.push(Change::new(ChangeKind::SchemaAdded, schema, "", schema));
        }
    }

    for (schema, old_schema) in old_schemas {
        let new_schema = match new_schemas.get(schema) {
            Some(s) => s,
            None => continue,
        };

        // Table add/remove with a rename heuristic: a removed table and an
        // added table with identical structure are reported as a rename.
        let mut removed: Vec<&String> = old_schema
            .tables
            .keys()
            .filter(|t| !new_schema.tables.contains_key(*t))
            .collect();
        let mut added: Vec<&String> = new_schema
            .tables
            .keys()
            .filter(|t| !old_schema.tables.contains_key(*t))
            .collect();
        removed.sort();
        added.sort();

        let mut renames: Vec<(String, String)> = Vec::new();
        for old_table in removed.clone() {
            if let Some(idx) = added.iter().position(|new_table| {
                old_schema.tables.get(old_table) == new_schema.tables.get(*new_table)
            }) {
                let new_table = added.remove(idx).clone();
                renames.push((old_table.clone(), new_table));
            }
        }
        removed.retain(|t| !renames.iter().any(|(old_t, _)| old_t == *t));

        for (old_table, new_table) in renames {
            changes.push(
                Change::new(ChangeKind::TableRenamed, schema, &old_table, &old_table)
                    .with_detail(new_table),
            );
        }
        for table in removed {
            changes.push(Change::new(ChangeKind::TableRemoved, schema, table, table));
        }
        for table in added {
            changes.push(Change::new(ChangeKind::TableAdded, schema, table, table));
        }

        for (table, old_table) in &old_schema.tables {
            let new_table = match new_schema.tables.get(table) {
                Some(t) => t,
                None => continue,
            };
            diff_table(schema, table, old_table, new_table, &mut changes);
        }
    }

    sort_changes(&mut changes);
    changes
}

fn diff_table(
    schema: &str,
    table: &str,
    old: &TableSnapshot,
    new: &TableSnapshot,
    changes: &mut Vec<Change>,
) {
    // Columns
    for (name, old_col) in &old.columns {
        match new.columns.get(name) {
            None => changes.push(Change::new(ChangeKind::ColumnRemoved, schema, table, name)),
            Some(new_col) => {
                if old_col.data_type != new_col.data_type {
                    changes.push(
                        Change::new(ChangeKind::ColumnTypeChanged, schema, table, name)
                            .with_detail(format!("{} -> {}", old_col.data_type, new_col.data_type)),
                    );
                }
                if old_col.nullable != new_col.nullable {
                    changes.push(
                        Change::new(ChangeKind::ColumnNullabilityChanged, schema, table, name)
                            .with_detail(format!(
                                "nullable: {} -> {}",
                                yes_no(old_col.nullable),
                                yes_no(new_col.nullable)
                            )),
                    );
                }
                if old_col.default != new_col.default {
                    changes.push(
                        Change::new(ChangeKind::ColumnDefaultChanged, schema, table, name)
                            .with_detail(format!(
                                "default: {} -> {}",
                                display_default(old_col.default.as_deref()),
                                display_default(new_col.default.as_deref())
                            )),
                    );
                }
            }
        }
    }
    for name in new.columns.keys() {
        if !old.columns.contains_key(name) {
            let data_type = &new.columns[name].data_type;
            changes.push(
                Change::new(ChangeKind::ColumnAdded, schema, table, name)
                    .with_detail(data_type.clone()),
            );
        }
    }

    // Primary key
    if old.primary_key != new.primary_key {
        changes.push(
            Change::new(ChangeKind::PrimaryKeyChanged, schema, table, "primary key").with_detail(
                format!("({}) -> ({})", old.primary_key.join(", "), new.primary_key.join(", ")),
            ),
        );
    }

    // Foreign keys
    for (name, old_fk) in &old.foreign_keys {
        match new.foreign_keys.get(name) {
            None => changes.push(Change::new(ChangeKind::ForeignKeyRemoved, schema, table, name)),
            Some(new_fk) => {
                if old_fk != new_fk {
                    changes.push(
                        Change::new(ChangeKind::ForeignKeyChanged, schema, table, name)
                            .with_detail(format!("{} -> {}", fk_summary(old_fk), fk_summary(new_fk))),
                    );
                }
            }
        }
    }
    for name in new.foreign_keys.keys() {
        if !old.foreign_keys.contains_key(name) {
            let fk = &new.foreign_keys[name];
            changes.push(
                Change::new(ChangeKind::ForeignKeyAdded, schema, table, name)
                    .with_detail(fk_summary(fk)),
            );
        }
    }

    // Unique constraints
    for (name, old_cols) in &old.unique_constraints {
        match new.unique_constraints.get(name) {
            None => changes.push(Change::new(
                ChangeKind::UniqueConstraintRemoved,
                schema,
                table,
                name,
            )),
            Some(new_cols) if old_cols != new_cols => changes.push(
                Change::new(ChangeKind::UniqueConstraintChanged, schema, table, name).with_detail(
                    format!("({}) -> ({})", old_cols.join(", "), new_cols.join(", ")),
                ),
            ),
            _ => {}
        }
    }
    for (name, cols) in &new.unique_constraints {
        if !old.unique_constraints.contains_key(name) {
            changes.push(
                Change::new(ChangeKind::UniqueConstraintAdded, schema, table, name)
                    .with_detail(format!("({})", cols.join(", "))),
            );
        }
    }

    // Check constraints
    for (name, old_def) in &old.check_constraints {
        match new.check_constraints.get(name) {
            None => changes.push(Change::new(
                ChangeKind::CheckConstraintRemoved,
                schema,
                table,
                name,
            )),
            Some(new_def) if old_def != new_def => changes.push(
                Change::new(ChangeKind::CheckConstraintChanged, schema, table, name)
                    .with_detail(format!("{old_def} -> {new_def}")),
            ),
            _ => {}
        }
    }
    for (name, def) in &new.check_constraints {
        if !old.check_constraints.contains_key(name) {
            changes.push(
                Change::new(ChangeKind::CheckConstraintAdded, schema, table, name)
                    .with_detail(def.clone()),
            );
        }
    }

    // Indexes
    for (name, old_idx) in &old.indexes {
        match new.indexes.get(name) {
            None => changes.push(Change::new(ChangeKind::IndexRemoved, schema, table, name)),
            Some(new_idx) if old_idx != new_idx => changes.push(
                Change::new(ChangeKind::IndexChanged, schema, table, name)
                    .with_detail(format!("{} -> {}", index_summary(old_idx), index_summary(new_idx))),
            ),
            _ => {}
        }
    }
    for (name, idx) in &new.indexes {
        if !old.indexes.contains_key(name) {
            changes.push(
                Change::new(ChangeKind::IndexAdded, schema, table, name)
                    .with_detail(index_summary(idx)),
            );
        }
    }
}

fn fk_summary(fk: &crate::snapshot::ForeignKeySnapshot) -> String {
    format!(
        "({}) -> {}.{}({})",
        fk.columns.join(", "),
        fk.references_schema,
        fk.references_table,
        fk.references_columns.join(", ")
    )
}

fn index_summary(idx: &crate::snapshot::IndexSnapshot) -> String {
    let mut summary = format!("({})", idx.columns.join(", "));
    if idx.unique {
        summary.push_str(" unique");
    }
    if let Some(pred) = &idx.predicate {
        summary.push_str(&format!(" where {pred}"));
    }
    summary
}

fn yes_no(value: bool) -> &'static str {
    if value {
        "yes"
    } else {
        "no"
    }
}

fn display_default(value: Option<&str>) -> &str {
    value.unwrap_or("none")
}

fn kind_rank(kind: &ChangeKind) -> u8 {
    match kind {
        ChangeKind::SchemaAdded | ChangeKind::SchemaRemoved => 0,
        ChangeKind::TableAdded | ChangeKind::TableRemoved | ChangeKind::TableRenamed => 1,
        ChangeKind::ColumnAdded | ChangeKind::ColumnRemoved => 2,
        ChangeKind::ColumnTypeChanged
        | ChangeKind::ColumnNullabilityChanged
        | ChangeKind::ColumnDefaultChanged => 3,
        ChangeKind::PrimaryKeyChanged => 4,
        ChangeKind::ForeignKeyAdded | ChangeKind::ForeignKeyRemoved | ChangeKind::ForeignKeyChanged => 5,
        ChangeKind::UniqueConstraintAdded
        | ChangeKind::UniqueConstraintRemoved
        | ChangeKind::UniqueConstraintChanged => 6,
        ChangeKind::CheckConstraintAdded
        | ChangeKind::CheckConstraintRemoved
        | ChangeKind::CheckConstraintChanged => 7,
        ChangeKind::IndexAdded | ChangeKind::IndexRemoved | ChangeKind::IndexChanged => 8,
    }
}

fn sort_changes(changes: &mut [Change]) {
    changes.sort_by(|a, b| {
        (&a.schema, &a.table, kind_rank(&a.kind), &a.object).cmp(&(
            &b.schema,
            &b.table,
            kind_rank(&b.kind),
            &b.object,
        ))
    });
}

/// Render changes as a compact, agent-friendly report grouped by table.
pub fn render_text(changes: &[Change]) -> String {
    if changes.is_empty() {
        return "No schema changes.\n".to_string();
    }

    let mut out = String::from("DATABASE SCHEMA CHANGES\n\n");
    let mut current: Option<(String, String)> = None;
    for change in changes {
        let key = (change.schema.clone(), change.table.clone());
        if current.as_ref() != Some(&key) {
            if current.is_some() {
                out.push('\n');
            }
            if change.schema == "public" || change.table.is_empty() {
                if change.table.is_empty() {
                    out.push_str(&format!("{}\n", change.schema));
                } else {
                    out.push_str(&format!("{}\n", change.table));
                }
            } else {
                out.push_str(&format!("{}.{}\n", change.schema, change.table));
            }
            current = Some(key);
        }
        out.push_str(&format!("  {}\n", render_line(change)));
    }
    out
}

fn render_line(change: &Change) -> String {
    let detail = change.detail.clone().unwrap_or_default();
    match &change.kind {
        ChangeKind::SchemaAdded => format!("+ schema {}", change.object),
        ChangeKind::SchemaRemoved => format!("- schema {}", change.object),
        ChangeKind::TableAdded => format!("+ {}", change.table),
        ChangeKind::TableRemoved => format!("- {}", change.table),
        ChangeKind::TableRenamed => format!("~ {} -> {} (likely rename)", change.object, detail),
        ChangeKind::ColumnAdded => format!("+ {} {}", change.object, detail),
        ChangeKind::ColumnRemoved => format!("- {}", change.object),
        ChangeKind::ColumnTypeChanged => format!("~ {} {}", change.object, detail),
        ChangeKind::ColumnNullabilityChanged => format!("~ {} {}", change.object, detail),
        ChangeKind::ColumnDefaultChanged => format!("~ {} {}", change.object, detail),
        ChangeKind::PrimaryKeyChanged => format!("~ {}", detail),
        ChangeKind::ForeignKeyAdded => format!("+ fk {} {}", change.object, detail),
        ChangeKind::ForeignKeyRemoved => format!("- fk {}", change.object),
        ChangeKind::ForeignKeyChanged => format!("~ fk {} {}", change.object, detail),
        ChangeKind::UniqueConstraintAdded => format!("+ unique {} {}", change.object, detail),
        ChangeKind::UniqueConstraintRemoved => format!("- unique {}", change.object),
        ChangeKind::UniqueConstraintChanged => format!("~ unique {} {}", change.object, detail),
        ChangeKind::CheckConstraintAdded => format!("+ check {} {}", change.object, detail),
        ChangeKind::CheckConstraintRemoved => format!("- check {}", change.object),
        ChangeKind::CheckConstraintChanged => format!("~ check {} {}", change.object, detail),
        ChangeKind::IndexAdded => format!("+ index {} {}", change.object, detail),
        ChangeKind::IndexRemoved => format!("- index {}", change.object),
        ChangeKind::IndexChanged => format!("~ index {} {}", change.object, detail),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::snapshot::{
        ColumnSnapshot, ForeignKeySnapshot, IndexSnapshot, SchemaSnapshot, TableSnapshot,
    };
    use std::collections::BTreeMap;

    fn snapshot_with(table: TableSnapshot) -> Snapshot {
        Snapshot {
            format_version: 1,
            database: crate::snapshot::DatabaseInfo {
                name: "test".to_string(),
                server_version: "16".to_string(),
            },
            schemas: BTreeMap::from([(
                "public".to_string(),
                SchemaSnapshot {
                    tables: BTreeMap::from([("messages".to_string(), table)]),
                },
            )]),
        }
    }

    fn base_table() -> TableSnapshot {
        TableSnapshot {
            columns: BTreeMap::from([
                (
                    "id".to_string(),
                    ColumnSnapshot {
                        ordinal: 1,
                        data_type: "integer".to_string(),
                        nullable: false,
                        default: None,
                    },
                ),
                (
                    "body".to_string(),
                    ColumnSnapshot {
                        ordinal: 2,
                        data_type: "text".to_string(),
                        nullable: false,
                        default: None,
                    },
                ),
            ]),
            primary_key: vec!["id".to_string()],
            ..Default::default()
        }
    }

    #[test]
    fn detects_column_added() {
        let old = snapshot_with(base_table());
        let mut new = old.clone();
        new.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("messages")
            .unwrap()
            .columns
            .insert(
                "metadata".to_string(),
                ColumnSnapshot {
                    ordinal: 3,
                    data_type: "jsonb".to_string(),
                    nullable: true,
                    default: None,
                },
            );
        let changes = diff_snapshots(&old, &new);
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].kind, ChangeKind::ColumnAdded);
        let text = render_text(&changes);
        assert!(text.contains("+ metadata jsonb"), "{text}");
    }

    #[test]
    fn detects_column_removed_and_type_changed() {
        let old = snapshot_with(base_table());
        let mut new = old.clone();
        let table = new
            .schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("messages")
            .unwrap();
        table.columns.remove("body");
        table
            .columns
            .get_mut("id")
            .unwrap()
            .data_type = "bigint".to_string();
        let changes = diff_snapshots(&old, &new);
        let text = render_text(&changes);
        assert!(text.contains("- body"), "{text}");
        assert!(text.contains("~ id integer -> bigint"), "{text}");
    }

    #[test]
    fn detects_table_added_and_removed() {
        let old = snapshot_with(base_table());
        let mut new = old.clone();
        let tables = &mut new.schemas.get_mut("public").unwrap().tables;
        tables.remove("messages");
        tables.insert("conversations".to_string(), TableSnapshot::default());
        let changes = diff_snapshots(&old, &new);
        let text = render_text(&changes);
        assert!(text.contains("+ conversations"), "{text}");
        assert!(text.contains("- messages"), "{text}");
    }

    #[test]
    fn detects_likely_rename() {
        let old = snapshot_with(base_table());
        let mut new = Snapshot {
            schemas: BTreeMap::from([(
                "public".to_string(),
                SchemaSnapshot {
                    tables: BTreeMap::new(),
                },
            )]),
            ..old.clone()
        };
        new.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .insert("msgs".to_string(), base_table());
        let changes = diff_snapshots(&old, &new);
        let text = render_text(&changes);
        assert!(text.contains("~ messages -> msgs (likely rename)"), "{text}");
    }

    #[test]
    fn detects_foreign_key_added() {
        let old = snapshot_with(base_table());
        let mut new = old.clone();
        new.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("messages")
            .unwrap()
            .foreign_keys
            .insert(
                "fk_messages_users".to_string(),
                ForeignKeySnapshot {
                    columns: vec!["user_id".to_string()],
                    references_schema: "public".to_string(),
                    references_table: "users".to_string(),
                    references_columns: vec!["id".to_string()],
                    on_update: "NO ACTION".to_string(),
                    on_delete: "CASCADE".to_string(),
                },
            );
        let changes = diff_snapshots(&old, &new);
        let text = render_text(&changes);
        assert!(text.contains("+ fk fk_messages_users"), "{text}");
        assert!(text.contains("users"), "{text}");
    }

    #[test]
    fn detects_index_added() {
        let old = snapshot_with(base_table());
        let mut new = old.clone();
        new.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("messages")
            .unwrap()
            .indexes
            .insert(
                "idx_messages_body".to_string(),
                IndexSnapshot {
                    unique: false,
                    primary: false,
                    method: "btree".to_string(),
                    columns: vec!["body".to_string()],
                    predicate: None,
                    definition: "CREATE INDEX idx_messages_body ON public.messages USING btree (body)"
                        .to_string(),
                },
            );
        let changes = diff_snapshots(&old, &new);
        let text = render_text(&changes);
        assert!(text.contains("+ index idx_messages_body (body)"), "{text}");
    }

    #[test]
    fn no_changes_renders_clean_message() {
        let old = snapshot_with(base_table());
        let changes = diff_snapshots(&old, &old);
        assert!(changes.is_empty());
        assert_eq!(render_text(&changes), "No schema changes.\n");
    }

    #[test]
    fn output_is_deterministic() {
        let old = snapshot_with(base_table());
        let mut new = old.clone();
        let table = new
            .schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("messages")
            .unwrap();
        table.columns.insert(
            "a".to_string(),
            ColumnSnapshot {
                ordinal: 3,
                data_type: "text".to_string(),
                nullable: true,
                default: None,
            },
        );
        table.columns.insert(
            "b".to_string(),
            ColumnSnapshot {
                ordinal: 4,
                data_type: "text".to_string(),
                nullable: true,
                default: None,
            },
        );
        let first = render_text(&diff_snapshots(&old, &new));
        let second = render_text(&diff_snapshots(&old, &new));
        assert_eq!(first, second);
    }
}
