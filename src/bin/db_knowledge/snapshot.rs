//! Deterministic snapshot model for the live database schema.
//!
//! The snapshot contains structural facts only: schemas, tables, columns,
//! types, nullability, defaults, primary keys, foreign keys, unique/check
//! constraints and indexes. It deliberately excludes volatile information
//! (row counts, timestamps, statistics, OIDs) so that the same schema always
//! produces the same snapshot.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::Path;

pub const FORMAT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Snapshot {
    pub format_version: u32,
    pub database: DatabaseInfo,
    pub schemas: BTreeMap<String, SchemaSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DatabaseInfo {
    pub name: String,
    pub server_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct SchemaSnapshot {
    pub tables: BTreeMap<String, TableSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct TableSnapshot {
    pub columns: BTreeMap<String, ColumnSnapshot>,
    pub primary_key: Vec<String>,
    pub foreign_keys: BTreeMap<String, ForeignKeySnapshot>,
    pub unique_constraints: BTreeMap<String, Vec<String>>,
    pub check_constraints: BTreeMap<String, String>,
    pub indexes: BTreeMap<String, IndexSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ColumnSnapshot {
    pub ordinal: i32,
    pub data_type: String,
    pub nullable: bool,
    pub default: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ForeignKeySnapshot {
    pub columns: Vec<String>,
    pub references_schema: String,
    pub references_table: String,
    pub references_columns: Vec<String>,
    pub on_update: String,
    pub on_delete: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IndexSnapshot {
    pub unique: bool,
    pub primary: bool,
    pub method: String,
    pub columns: Vec<String>,
    pub predicate: Option<String>,
    pub definition: String,
}

impl Snapshot {
    pub fn load(path: &Path) -> Result<Option<Self>, String> {
        if !path.exists() {
            return Ok(None);
        }
        let raw = std::fs::read_to_string(path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        let parsed: Snapshot = serde_json::from_str(&raw)
            .map_err(|e| format!("failed to parse {}: {e}", path.display()))?;
        Ok(Some(parsed))
    }

    pub fn save(&self, path: &Path) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create {}: {e}", parent.display()))?;
        }
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("failed to serialize snapshot: {e}"))?;
        std::fs::write(path, format!("{json}\n"))
            .map_err(|e| format!("failed to write {}: {e}", path.display()))
    }

    pub fn table(&self, schema: &str, table: &str) -> Option<&TableSnapshot> {
        self.schemas.get(schema).and_then(|s| s.tables.get(table))
    }

    /// All (schema, table) pairs sorted by schema then table.
    pub fn table_names(&self) -> Vec<(String, String)> {
        let mut out = Vec::new();
        for (schema, s) in &self.schemas {
            for table in s.tables.keys() {
                out.push((schema.clone(), table.clone()));
            }
        }
        out
    }

    pub fn table_count(&self) -> usize {
        self.schemas.values().map(|s| s.tables.len()).sum()
    }

    pub fn column_count(&self) -> usize {
        self.schemas
            .values()
            .flat_map(|s| s.tables.values())
            .map(|t| t.columns.len())
            .sum()
    }

    pub fn index_count(&self) -> usize {
        self.schemas
            .values()
            .flat_map(|s| s.tables.values())
            .map(|t| t.indexes.len())
            .sum()
    }
}

/// Stable, dependency-free 64-bit FNV-1a hash, used only for staleness
/// detection of documentation (not for security).
pub fn fnv1a64_hex(data: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in data.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{hash:016x}")
}

/// Canonical hash of one table's structural facts.
pub fn table_hash(table: &TableSnapshot) -> String {
    let json = serde_json::to_string(table).unwrap_or_default();
    format!("fnv1a64:{}", fnv1a64_hex(&json))
}

/// Machine-readable relationship graph derived from foreign keys.
///
/// `{ "table": { "belongs_to": ["parent"], "referenced_by": ["child"] } }`
pub fn relationship_graph(snapshot: &Snapshot) -> serde_json::Value {
    let mut graph: BTreeMap<String, BTreeMap<String, Vec<String>>> = BTreeMap::new();

    for schema in snapshot.schemas.values() {
        for (table, snap) in &schema.tables {
            let entry = graph.entry(table.clone()).or_default();
            entry.entry("belongs_to".to_string()).or_default();
            entry.entry("referenced_by".to_string()).or_default();
            for fk in snap.foreign_keys.values() {
                let parents = entry.get_mut("belongs_to").unwrap();
                if !parents.contains(&fk.references_table) {
                    parents.push(fk.references_table.clone());
                }
            }
        }
    }

    for schema in snapshot.schemas.values() {
        for (table, snap) in &schema.tables {
            for fk in snap.foreign_keys.values() {
                let target = graph
                    .entry(fk.references_table.clone())
                    .or_default()
                    .entry("referenced_by".to_string())
                    .or_default();
                if !target.contains(table) {
                    target.push(table.clone());
                }
            }
        }
    }

    for entry in graph.values_mut() {
        if let Some(v) = entry.get_mut("belongs_to") {
            v.sort();
        }
        if let Some(v) = entry.get_mut("referenced_by") {
            v.sort();
        }
    }

    let mut out = serde_json::Map::new();
    for (table, mut entry) in graph {
        let mut obj = serde_json::Map::new();
        obj.insert(
            "belongs_to".to_string(),
            serde_json::Value::Array(
                entry
                    .remove("belongs_to")
                    .unwrap_or_default()
                    .into_iter()
                    .map(serde_json::Value::String)
                    .collect(),
            ),
        );
        obj.insert(
            "referenced_by".to_string(),
            serde_json::Value::Array(
                entry
                    .remove("referenced_by")
                    .unwrap_or_default()
                    .into_iter()
                    .map(serde_json::Value::String)
                    .collect(),
            ),
        );
        out.insert(table, serde_json::Value::Object(obj));
    }
    serde_json::Value::Object(out)
}

/// Render a compact foreign-key graph for `relationships.md`.
pub fn render_fk_list(snapshot: &Snapshot) -> String {
    let graph = relationship_graph(snapshot);
    let mut out = String::new();
    if let Some(obj) = graph.as_object() {
        for (table, entry) in obj {
            let belongs = entry
                .get("belongs_to")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();
            let referenced = entry
                .get("referenced_by")
                .and_then(|v| v.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();
            let _ = writeln!(out, "- **{table}**");
            if !belongs.is_empty() {
                let _ = writeln!(out, "  - → {belongs}");
            }
            if !referenced.is_empty() {
                let _ = writeln!(out, "  - ← {referenced}");
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Snapshot {
        let mut tables = BTreeMap::new();
        tables.insert(
            "batch_sales".to_string(),
            TableSnapshot {
                columns: BTreeMap::from([(
                    "id".to_string(),
                    ColumnSnapshot {
                        ordinal: 1,
                        data_type: "integer".to_string(),
                        nullable: false,
                        default: Some("nextval('batch_sales_id_seq'::regclass)".to_string()),
                    },
                )]),
                primary_key: vec!["id".to_string()],
                ..Default::default()
            },
        );
        Snapshot {
            format_version: FORMAT_VERSION,
            database: DatabaseInfo {
                name: "rjagro".to_string(),
                server_version: "16.11".to_string(),
            },
            schemas: BTreeMap::from([("public".to_string(), SchemaSnapshot { tables })]),
        }
    }

    #[test]
    fn hash_is_deterministic() {
        let a = table_hash(sample().table("public", "batch_sales").unwrap());
        let b = table_hash(sample().table("public", "batch_sales").unwrap());
        assert_eq!(a, b);
        assert!(a.starts_with("fnv1a64:"));
    }

    #[test]
    fn hash_changes_when_structure_changes() {
        let mut snap = sample();
        let before = table_hash(snap.table("public", "batch_sales").unwrap());
        snap.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("batch_sales")
            .unwrap()
            .columns
            .insert(
                "value".to_string(),
                ColumnSnapshot {
                    ordinal: 2,
                    data_type: "numeric(12,2)".to_string(),
                    nullable: false,
                    default: None,
                },
            );
        let after = table_hash(snap.table("public", "batch_sales").unwrap());
        assert_ne!(before, after);
    }

    #[test]
    fn relationship_graph_links_both_directions() {
        let mut snap = sample();
        let mut fk = BTreeMap::new();
        fk.insert(
            "fk_batch_sales_batches".to_string(),
            ForeignKeySnapshot {
                columns: vec!["batch_id".to_string()],
                references_schema: "public".to_string(),
                references_table: "batches".to_string(),
                references_columns: vec!["batch_id".to_string()],
                on_update: "NO ACTION".to_string(),
                on_delete: "CASCADE".to_string(),
            },
        );
        snap.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("batch_sales")
            .unwrap()
            .foreign_keys = fk;
        snap.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .insert("batches".to_string(), TableSnapshot::default());

        let graph = relationship_graph(&snap);
        assert_eq!(
            graph["batch_sales"]["belongs_to"],
            serde_json::json!(["batches"])
        );
        assert_eq!(
            graph["batches"]["referenced_by"],
            serde_json::json!(["batch_sales"])
        );
    }
}
