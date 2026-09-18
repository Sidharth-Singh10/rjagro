//! Table documentation files.
//!
//! Each `database/tables/<table>.md` file combines:
//!   * a small YAML-ish front matter block (staleness metadata),
//!   * hand-written semantic sections, and
//!   * a generated structural block delimited by markers.
//!
//! `sync` only ever rewrites the generated block and front-matter keys; the
//! semantic prose is never overwritten.

use crate::snapshot::{table_hash, TableSnapshot};
use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};

pub const GENERATED_BEGIN: &str = "<!-- BEGIN GENERATED: schema -->";
pub const GENERATED_END: &str = "<!-- END GENERATED: schema -->";

pub fn table_doc_path(dir: &Path, table: &str) -> PathBuf {
    dir.join("tables").join(format!("{table}.md"))
}

pub fn read_front_matter(path: &Path) -> Result<BTreeMap<String, String>, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let mut lines = content.lines();
    let mut map = BTreeMap::new();
    if lines.next().map(str::trim) != Some("---") {
        return Ok(map);
    }
    for line in lines {
        let line = line.trim();
        if line == "---" {
            break;
        }
        if let Some((key, value)) = line.split_once(':') {
            map.insert(key.trim().to_string(), value.trim().to_string());
        }
    }
    Ok(map)
}

pub fn set_front_matter_key(path: &Path, key: &str, value: &str) -> Result<(), String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
    if lines.first().map(|l| l.trim()) != Some("---") {
        return Err(format!("{} has no front matter block", path.display()));
    }

    let end = lines
        .iter()
        .skip(1)
        .position(|l| l.trim() == "---")
        .map(|i| i + 1)
        .ok_or_else(|| format!("{} has an unterminated front matter block", path.display()))?;

    let mut replaced = false;
    for line in lines.iter_mut().take(end).skip(1) {
        if let Some((k, _)) = line.split_once(':') {
            if k.trim() == key {
                *line = format!("{key}: {value}");
                replaced = true;
                break;
            }
        }
    }
    if !replaced {
        lines.insert(end, format!("{key}: {value}"));
    }

    let mut output = lines.join("\n");
    output.push('\n');
    std::fs::write(path, output).map_err(|e| format!("failed to write {}: {e}", path.display()))
}

/// Replace the generated structural block in a table doc.
/// Returns `Ok(false)` when the file has no generated markers.
pub fn update_generated_block(path: &Path, block: &str) -> Result<bool, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let begin = match content.find(GENERATED_BEGIN) {
        Some(idx) => idx,
        None => return Ok(false),
    };
    let end_marker = match content.find(GENERATED_END) {
        Some(idx) => idx,
        None => return Ok(false),
    };
    let end = end_marker + GENERATED_END.len();

    let mut output = String::new();
    output.push_str(&content[..begin]);
    output.push_str(block.trim_end());
    output.push_str(&content[end..]);
    std::fs::write(path, output).map_err(|e| format!("failed to write {}: {e}", path.display()))?;
    Ok(true)
}

pub fn render_generated_block(_table: &str, snap: &TableSnapshot) -> String {
    let mut out = String::new();
    out.push_str(GENERATED_BEGIN);
    out.push_str("\n## Columns\n\n");

    if snap.columns.is_empty() {
        out.push_str("_None._\n");
    } else {
        out.push_str("| Column | Type | Nullable | Default |\n|---|---|---|---|\n");
        for (name, col) in &snap.columns {
            let _ = writeln!(
                out,
                "| {} | {} | {} | {} |",
                escape_cell(name),
                escape_cell(&col.data_type),
                if col.nullable { "yes" } else { "no" },
                escape_cell(col.default.as_deref().unwrap_or("—"))
            );
        }
    }

    out.push_str("\n## Primary Key\n\n");
    if snap.primary_key.is_empty() {
        out.push_str("_None._\n");
    } else {
        let _ = writeln!(out, "`{}`", snap.primary_key.join("`, `"));
    }

    out.push_str("\n## Foreign Keys\n\n");
    if snap.foreign_keys.is_empty() {
        out.push_str("_None._\n");
    } else {
        out.push_str("| Constraint | Columns | References | On Update | On Delete |\n|---|---|---|---|---|\n");
        for (name, fk) in &snap.foreign_keys {
            let _ = writeln!(
                out,
                "| {} | {} | {}.{}({}) | {} | {} |",
                escape_cell(name),
                escape_cell(&fk.columns.join(", ")),
                escape_cell(&fk.references_schema),
                escape_cell(&fk.references_table),
                escape_cell(&fk.references_columns.join(", ")),
                escape_cell(&fk.on_update),
                escape_cell(&fk.on_delete)
            );
        }
    }

    out.push_str("\n## Indexes\n\n");
    if snap.indexes.is_empty() {
        out.push_str("_None._\n");
    } else {
        out.push_str("| Index | Unique | Method | Columns | Predicate |\n|---|---|---|---|---|\n");
        for (name, idx) in &snap.indexes {
            let _ = writeln!(
                out,
                "| {} | {} | {} | {} | {} |",
                escape_cell(name),
                if idx.unique { "yes" } else { "no" },
                escape_cell(&idx.method),
                escape_cell(&idx.columns.join(", ")),
                escape_cell(idx.predicate.as_deref().unwrap_or("—"))
            );
        }
    }

    out.push_str("\n## Constraints\n\n");
    if snap.unique_constraints.is_empty() && snap.check_constraints.is_empty() {
        out.push_str("_None._\n");
    } else {
        for (name, cols) in &snap.unique_constraints {
            let _ = writeln!(out, "- `{name}`: UNIQUE ({})", cols.join(", "));
        }
        for (name, def) in &snap.check_constraints {
            let _ = writeln!(out, "- `{name}`: {def}");
        }
    }

    out.push('\n');
    out.push_str(GENERATED_END);
    out.push('\n');
    out
}

fn escape_cell(value: &str) -> String {
    value.replace('|', "\\|").replace('\n', " ")
}

/// Write a new table doc. Returns `Ok(false)` when the file already exists
/// (bootstrap never overwrites semantic content).
pub fn write_table_doc(
    dir: &Path,
    schema: &str,
    table: &str,
    snap: &TableSnapshot,
    candidates: &[(String, usize)],
    today: &str,
) -> Result<bool, String> {
    let path = table_doc_path(dir, table);
    if path.exists() {
        return Ok(false);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create {}: {e}", parent.display()))?;
    }

    let owner_hint = if candidates.is_empty() {
        String::new()
    } else {
        let list = candidates
            .iter()
            .take(3)
            .map(|(file, count)| format!("`{file}` ({count} refs)"))
            .collect::<Vec<_>>()
            .join(", ");
        format!("\n\nCandidate code (inferred — needs verification): {list}")
    };

    let block = render_generated_block(table, snap);
    let content = format!(
        r#"---
table: {table}
schema_hash: {hash}
last_schema_verified: {today}
semantic_confidence: needs-verification
---

# {table}

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `{schema}`

## Owner

Unknown — needs verification.{owner_hint}

## Consumers

Unknown — needs verification.

{block}
## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships {table}`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM {table}
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships {table}` or `./db-knowledge impact {table}`.

## Last Verified

Structural: {today} (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
"#,
        hash = table_hash(snap),
        today = today,
    );

    std::fs::write(&path, content)
        .map_err(|e| format!("failed to write {}: {e}", path.display()))?;
    Ok(true)
}

/// Tables whose docs are missing or whose recorded schema hash no longer
/// matches the live snapshot.
pub fn stale_tables(dir: &Path, snapshot: &crate::snapshot::Snapshot) -> Vec<String> {
    let mut stale = Vec::new();
    for (_, table) in snapshot.table_names() {
        let snap = match snapshot.table("public", &table) {
            Some(s) => s,
            None => continue,
        };
        let path = table_doc_path(dir, &table);
        if !path.exists() {
            stale.push(table);
            continue;
        }
        let fm = match read_front_matter(&path) {
            Ok(fm) => fm,
            Err(_) => {
                stale.push(table);
                continue;
            }
        };
        match fm.get("schema_hash") {
            Some(hash) if hash == &table_hash(snap) => {}
            _ => stale.push(table),
        }
    }
    stale.sort();
    stale
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::snapshot::ColumnSnapshot;

    fn temp_dir(tag: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("dbk-{tag}-{}-{nanos}", std::process::id()))
    }

    fn sample_table() -> TableSnapshot {
        TableSnapshot {
            columns: BTreeMap::from([(
                "id".to_string(),
                ColumnSnapshot {
                    ordinal: 1,
                    data_type: "integer".to_string(),
                    nullable: false,
                    default: None,
                },
            )]),
            primary_key: vec!["id".to_string()],
            ..Default::default()
        }
    }

    #[test]
    fn writes_doc_with_front_matter_and_markers() {
        let dir = temp_dir("docs");
        let snap = sample_table();
        assert!(write_table_doc(&dir, "public", "messages", &snap, &[], "2026-09-18").unwrap());
        // Never overwrite an existing doc.
        assert!(!write_table_doc(&dir, "public", "messages", &snap, &[], "2026-09-18").unwrap());

        let path = table_doc_path(&dir, "messages");
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("schema_hash:"));
        assert!(content.contains(GENERATED_BEGIN));
        assert!(content.contains("| id | integer | no | — |"));
        let fm = read_front_matter(&path).unwrap();
        assert_eq!(fm.get("table").unwrap(), "messages");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn updates_generated_block_but_preserves_semantics() {
        let dir = temp_dir("docs-update");
        let mut snap = sample_table();
        write_table_doc(&dir, "public", "messages", &snap, &[], "2026-09-18").unwrap();
        let path = table_doc_path(&dir, "messages");

        let mut content = std::fs::read_to_string(&path).unwrap();
        content = content.replace("Unknown — needs verification.\n\n## Database", "Stores chat messages.\n\n## Database");
        std::fs::write(&path, content).unwrap();

        snap.columns.insert(
            "body".to_string(),
            ColumnSnapshot {
                ordinal: 2,
                data_type: "text".to_string(),
                nullable: false,
                default: None,
            },
        );
        let block = render_generated_block("messages", &snap);
        assert!(update_generated_block(&path, &block).unwrap());

        let updated = std::fs::read_to_string(&path).unwrap();
        assert!(updated.contains("Stores chat messages."));
        assert!(updated.contains("| body | text | no | — |"));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn front_matter_key_updates_and_inserts() {
        let dir = temp_dir("fm");
        let snap = sample_table();
        write_table_doc(&dir, "public", "messages", &snap, &[], "2026-09-18").unwrap();
        let path = table_doc_path(&dir, "messages");
        set_front_matter_key(&path, "last_schema_verified", "2026-09-19").unwrap();
        set_front_matter_key(&path, "semantic_confidence", "documented").unwrap();
        let fm = read_front_matter(&path).unwrap();
        assert_eq!(fm.get("last_schema_verified").unwrap(), "2026-09-19");
        assert_eq!(fm.get("semantic_confidence").unwrap(), "documented");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn stale_detection_reports_missing_and_changed() {
        let dir = temp_dir("stale");
        let mut snap = crate::snapshot::Snapshot {
            format_version: 1,
            database: crate::snapshot::DatabaseInfo {
                name: "test".to_string(),
                server_version: "16".to_string(),
            },
            schemas: BTreeMap::from([(
                "public".to_string(),
                crate::snapshot::SchemaSnapshot {
                    tables: BTreeMap::from([("messages".to_string(), sample_table())]),
                },
            )]),
        };
        assert_eq!(stale_tables(&dir, &snap), vec!["messages".to_string()]);

        write_table_doc(&dir, "public", "messages", &sample_table(), &[], "2026-09-18").unwrap();
        assert!(stale_tables(&dir, &snap).is_empty());

        snap.schemas
            .get_mut("public")
            .unwrap()
            .tables
            .get_mut("messages")
            .unwrap()
            .columns
            .insert(
                "body".to_string(),
                ColumnSnapshot {
                    ordinal: 2,
                    data_type: "text".to_string(),
                    nullable: false,
                    default: None,
                },
            );
        assert_eq!(stale_tables(&dir, &snap), vec!["messages".to_string()]);
        std::fs::remove_dir_all(&dir).ok();
    }
}
