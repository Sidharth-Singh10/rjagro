//! Codebase discovery.
//!
//! Scans Rust sources for table references so the knowledge base can point at
//! real evidence (`file:line`-style file paths) instead of guessing ownership
//! from table names. Everything produced here is heuristic and is written to
//! documentation with an explicit "needs verification" marker.

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RefCounts {
    pub total: usize,
    pub write_hits: usize,
    pub read_hits: usize,
}

#[derive(Debug, Default)]
pub struct ScanResult {
    /// file (repo-relative) -> table -> counts
    pub by_file: BTreeMap<String, BTreeMap<String, RefCounts>>,
    /// table -> (file, counts), sorted by total desc then file
    pub by_table: BTreeMap<String, Vec<(String, RefCounts)>>,
}

impl ScanResult {
    pub fn candidates_for(&self, table: &str) -> Vec<(String, usize)> {
        self.by_table
            .get(table)
            .map(|refs| {
                refs.iter()
                    .map(|(file, counts)| (file.clone(), counts.total))
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn likely_writers(&self, table: &str) -> Vec<String> {
        self.by_table
            .get(table)
            .map(|refs| {
                refs.iter()
                    .filter(|(_, c)| c.write_hits > 0)
                    .map(|(file, _)| file.clone())
                    .collect()
            })
            .unwrap_or_default()
    }
}

const WRITE_MARKERS: &[&str] = &[
    "insert(",
    "insert_batch",
    "ActiveModel",
    "update(",
    "delete(",
    ".save(",
    "INSERT INTO",
    "UPDATE ",
    "DELETE FROM",
    "ALTER TABLE",
    "TRUNCATE",
    "update_account_balance",
];

const READ_MARKERS: &[&str] = &[
    "find(",
    "filter(",
    "SELECT",
    "query_all",
    "query_one",
    "from_raw_sql",
    "into_json",
    "count(",
    "find_by_id",
];

/// Scan `src/` for references to the given table names.
///
/// `entity/src` is intentionally excluded: those files are sea-orm models and
/// module re-exports, not usage evidence.
pub fn scan_repo(repo_root: &Path, tables: &[String]) -> Result<ScanResult, String> {
    let mut files: Vec<PathBuf> = Vec::new();
    collect_rust_files(&repo_root.join("src"), &mut files)?;

    let mut result = ScanResult::default();
    for path in files {
        let rel = path
            .strip_prefix(repo_root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        // The knowledge tooling itself is not application evidence.
        if rel.contains("db_knowledge") {
            continue;
        }
        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let mut per_file: BTreeMap<String, RefCounts> = BTreeMap::new();
        for table in tables {
            let counts = count_references(&content, table);
            if counts.total > 0 {
                per_file.insert(table.clone(), counts);
            }
        }
        if per_file.is_empty() {
            continue;
        }
        for (table, counts) in &per_file {
            result
                .by_table
                .entry(table.clone())
                .or_default()
                .push((rel.clone(), counts.clone()));
        }
        result.by_file.insert(rel, per_file);
    }

    for refs in result.by_table.values_mut() {
        refs.sort_by(|a, b| b.1.total.cmp(&a.1.total).then_with(|| a.0.cmp(&b.0)));
    }

    Ok(result)
}

fn collect_rust_files(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }
    let entries =
        std::fs::read_dir(dir).map_err(|e| format!("failed to read {}: {e}", dir.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if name == "target" || name == ".git" || name == "node_modules" {
                continue;
            }
            collect_rust_files(&path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("rs") {
            out.push(path);
        }
    }
    Ok(())
}

fn count_references(content: &str, table: &str) -> RefCounts {
    let mut counts = RefCounts::default();
    for (idx, _) in content.match_indices(table) {
        if !is_word_at(content, idx, table.len()) {
            continue;
        }
        counts.total += 1;
        let mut start = idx.saturating_sub(200);
        while start > 0 && !content.is_char_boundary(start) {
            start -= 1;
        }
        let mut end = (idx + table.len() + 200).min(content.len());
        while end > start && !content.is_char_boundary(end) {
            end -= 1;
        }
        let window = &content[start..end];
        if WRITE_MARKERS.iter().any(|m| window.contains(m)) {
            counts.write_hits += 1;
        }
        if READ_MARKERS.iter().any(|m| window.contains(m)) {
            counts.read_hits += 1;
        }
    }
    counts
}

/// True when `needle` at `idx` is not part of a larger identifier.
fn is_word_at(haystack: &str, idx: usize, len: usize) -> bool {
    let bytes = haystack.as_bytes();
    let before_ok = idx == 0 || !is_ident_byte(bytes[idx - 1]);
    let after = idx + len;
    let after_ok = after >= bytes.len() || !is_ident_byte(bytes[after]);
    before_ok && after_ok
}

fn is_ident_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || byte == b'_'
}

pub fn render_services_md(scan: &ScanResult) -> String {
    let mut out = String::new();
    out.push_str("# Service → Database Ownership\n\n");
    out.push_str(
        "> This repo is a Rust monolith (`src/handlers/*`, `src/routes/*`) plus a\n\
         > Next.js admin frontend and two out-of-repo apps (`rjagro_traders`,\n\
         > `rjagro_supervisor`). Ownership below is inferred from actual code\n\
         > references (entity imports and raw SQL) and is marked\n\
         > **needs verification** until confirmed by a human or agent.\n\n",
    );
    out.push_str("<!-- BEGIN GENERATED: services -->\n");
    out.push_str("## Reference index (generated — needs verification)\n\n");
    out.push_str("| File | Tables referenced |\n|---|---|\n");
    for (file, tables) in &scan.by_file {
        let list = tables
            .iter()
            .map(|(table, counts)| {
                let tag = if counts.write_hits > 0 && counts.read_hits > 0 {
                    "rw?"
                } else if counts.write_hits > 0 {
                    "w?"
                } else if counts.read_hits > 0 {
                    "r?"
                } else {
                    "ref"
                };
                format!("`{table}` ({tag} {})", counts.total)
            })
            .collect::<Vec<_>>()
            .join(", ");
        let _ = writeln!(out, "| `{file}` | {list} |");
    }
    out.push_str("<!-- END GENERATED: services -->\n\n");

    out.push_str(
        "## Curated ownership\n\n\
         Confirm the writer(s) and reader(s) for each table here, with evidence:\n\n\
         ```text\n\
         ## <module or app>\n\
         Writes: <table> (<evidence file>)\n\
         Reads:  <table> (<evidence file>)\n\
         ```\n",
    );
    out
}

pub fn render_data_flows_md(scan: &ScanResult) -> String {
    let mut out = String::new();
    out.push_str("# Data Flows\n\n");
    out.push_str(
        "> Candidate flows detected from files that touch more than one table.\n\
         > These are **inferred — needs verification**; curate them with real\n\
         > reasoning and evidence in the section below the generated block.\n\n",
    );
    out.push_str("<!-- BEGIN GENERATED: flows -->\n");
    out.push_str("## Candidate flows (generated)\n\n");
    let mut any = false;
    for (file, tables) in &scan.by_file {
        if tables.len() < 2 {
            continue;
        }
        any = true;
        let list = tables.keys().cloned().collect::<Vec<_>>().join(", ");
        let _ = writeln!(out, "- `{file}` touches: {list}");
    }
    if !any {
        out.push_str("_No multi-table files detected._\n");
    }
    out.push_str("<!-- END GENERATED: flows -->\n\n");
    out.push_str(
        "## Curated flows\n\n\
         Describe the end-to-end flows with table names and evidence, for example:\n\n\
         ```text\n\
         purchase (purchases) → stock_receipts → batch_allocation_lines → batches\n\
         ```\n",
    );
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn word_boundary_matching() {
        assert!(is_word_at("let x = batch_sales::Entity", 8, "batch_sales".len()));
        assert!(!is_word_at("let x = my_batch_sales_x", 9, "batch_sales".len()));
        assert!(!is_word_at("let x = batch_sales_extra", 8, "batch_sales".len()));
    }

    #[test]
    fn counts_reads_and_writes() {
        let content = r#"
            use entity::batch_sales;
            batch_sales::Entity::find().all(db).await;
            batch_sales::ActiveModel { ..Default::default() }.insert(db).await;
        "#;
        let counts = count_references(content, "batch_sales");
        assert_eq!(counts.total, 3);
        assert!(counts.read_hits > 0);
        assert!(counts.write_hits > 0);
    }

    #[test]
    fn handles_multibyte_windows() {
        let content = format!(
            "{}batch_sales{}",
            "─".repeat(300),
            "─".repeat(300)
        );
        let counts = count_references(&content, "batch_sales");
        assert_eq!(counts.total, 1);
    }

    #[test]
    fn scans_temp_repo() {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("dbk-scan-{}-{nanos}", std::process::id()));
        std::fs::create_dir_all(root.join("src/handlers")).unwrap();
        std::fs::write(
            root.join("src/handlers/example.rs"),
            "use entity::batch_sales;\nbatch_sales::Entity::find();\n",
        )
        .unwrap();
        let scan = scan_repo(&root, &["batch_sales".to_string()]).unwrap();
        assert_eq!(scan.by_table["batch_sales"].len(), 1);
        assert_eq!(scan.by_table["batch_sales"][0].0, "src/handlers/example.rs");
        let md = render_services_md(&scan);
        assert!(md.contains("src/handlers/example.rs"));
        std::fs::remove_dir_all(&root).ok();
    }
}
