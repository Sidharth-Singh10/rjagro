//! Command implementations.
//!
//! Read-only against the application database. `bootstrap`, `sync` and
//! `verify` write files, and only inside the knowledge directory.

use crate::db;
use crate::diff::{diff_snapshots, render_text};
use crate::discover::{render_data_flows_md, render_services_md, scan_repo};
use crate::docs;
use crate::introspect;
use crate::snapshot::{relationship_graph, render_fk_list, Snapshot};
use crate::Cli;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::process::Command;

pub async fn run(cli: &Cli) -> Result<(), String> {
    match cli.command.as_str() {
        "bootstrap" => bootstrap(cli).await,
        "sync" => sync(cli).await,
        "diff" => diff_cmd(cli).await,
        "overview" => overview(cli),
        "table" => table_cmd(cli),
        "search" => search_cmd(cli),
        "relationships" => relationships_cmd(cli),
        "domain" => domain_cmd(cli),
        "impact" => impact_cmd(cli),
        "changed" => changed_cmd(cli),
        "verify" => verify_cmd(cli).await,
        other => Err(format!(
            "unknown command: {other} (run `db-knowledge --help`)"
        )),
    }
}

fn repo_root() -> Result<PathBuf, String> {
    std::env::current_dir().map_err(|e| format!("failed to resolve working directory: {e}"))
}

fn snapshot_path(cli: &Cli) -> PathBuf {
    cli.dir.join("schema-snapshot").join("current.json")
}

fn relationships_json_path(cli: &Cli) -> PathBuf {
    cli.dir.join("relationships.json")
}

fn domains_json_path(cli: &Cli) -> PathBuf {
    cli.dir.join("domains.json")
}

fn today() -> String {
    chrono::Local::now().date_naive().format("%Y-%m-%d").to_string()
}

fn write_if_missing(path: &Path, content: &str) -> Result<bool, String> {
    if path.exists() {
        return Ok(false);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create {}: {e}", parent.display()))?;
    }
    std::fs::write(path, content).map_err(|e| format!("failed to write {}: {e}", path.display()))?;
    Ok(true)
}

fn write_json(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create {}: {e}", parent.display()))?;
    }
    let json = serde_json::to_string_pretty(value)
        .map_err(|e| format!("failed to serialize {}: {e}", path.display()))?;
    std::fs::write(path, format!("{json}\n"))
        .map_err(|e| format!("failed to write {}: {e}", path.display()))
}

async fn live_snapshot(cli: &Cli) -> Result<Snapshot, String> {
    let root = repo_root()?;
    let conn = db::connect(&root).await?;
    introspect::introspect(&conn, &cli.schemas).await
}

// ── bootstrap ───────────────────────────────────────────────────────────────

async fn bootstrap(cli: &Cli) -> Result<(), String> {
    let root = repo_root()?;
    let snapshot_file = snapshot_path(cli);
    let existing = snapshot_file.exists();
    if existing && !cli.force {
        return Err(format!(
            "{} already exists — use `sync` to update it, or `bootstrap --force` to re-run",
            snapshot_file.display()
        ));
    }

    let snapshot = live_snapshot(cli).await?;
    snapshot.save(&snapshot_file)?;
    write_json(&relationships_json_path(cli), &relationship_graph(&snapshot))?;

    let tables: Vec<String> = snapshot.table_names().into_iter().map(|(_, t)| t).collect();
    let scan = scan_repo(&root, &tables)?;

    // Seed domains if missing.
    if !domains_json_path(cli).exists() {
        let mut unassigned = serde_json::Map::new();
        for (_, table) in snapshot.table_names() {
            unassigned.insert(table, serde_json::json!(true));
        }
        let seed = serde_json::json!({
            "_note": "Curate domains: move tables from `unassigned` into named domains. `db-knowledge domain <name>` reads this file.",
            "unassigned": {
                "description": "Tables not yet assigned to a domain — needs verification.",
                "tables": unassigned.keys().cloned().collect::<Vec<_>>(),
            }
        });
        write_json(&domains_json_path(cli), &seed)?;
    }

    // Table docs (never overwrite existing semantic content).
    let mut created_docs = 0usize;
    for (schema, table) in snapshot.table_names() {
        let snap = snapshot.table(&schema, &table).unwrap();
        let candidates = scan.candidates_for(&table);
        if docs::write_table_doc(&cli.dir, &schema, &table, snap, &candidates, &today())? {
            created_docs += 1;
        }
    }

    // Architecture documents.
    let mut created_arch = Vec::new();
    let schema_md = render_schema_md(&snapshot, &scan, &today());
    if write_if_missing(&cli.dir.join("schema.md"), &schema_md)? {
        created_arch.push("schema.md");
    }
    let relationships_md = render_relationships_md(&snapshot);
    if write_if_missing(&cli.dir.join("relationships.md"), &relationships_md)? {
        created_arch.push("relationships.md");
    }
    let services_md = render_services_md(&scan);
    if write_if_missing(&cli.dir.join("services.md"), &services_md)? {
        created_arch.push("services.md");
    }
    let flows_md = render_data_flows_md(&scan);
    if write_if_missing(&cli.dir.join("data-flows.md"), &flows_md)? {
        created_arch.push("data-flows.md");
    }
    if write_if_missing(&cli.dir.join("invariants.md"), &render_invariants_md())? {
        created_arch.push("invariants.md");
    }
    if write_if_missing(&cli.dir.join("debugging.md"), &render_debugging_md())? {
        created_arch.push("debugging.md");
    }
    let readme = render_readme_md(&snapshot, &today());
    if write_if_missing(&cli.dir.join("README.md"), &readme)? {
        created_arch.push("README.md");
    }

    // Refresh generated sections (also covers `bootstrap --force` over an
    // existing knowledge base without touching semantic sections).
    refresh_generated_sections(cli, &snapshot, &scan)?;

    // History entries for the SQL schema additions that exist in the repo.
    let history = write_sql_history(&root, cli)?;
    let bootstrap_history = cli.dir.join("history").join(format!("{}-bootstrap.md", today()));
    let bootstrap_entry = render_bootstrap_history(&snapshot, &today());
    write_if_missing(&bootstrap_history, &bootstrap_entry)?;

    println!("Database knowledge base {}", if existing { "refreshed" } else { "created" });
    println!(
        "  database: {} ({}, {} schemas)",
        snapshot.database.name,
        format!("PostgreSQL {}", snapshot.database.server_version),
        snapshot.schemas.len()
    );
    println!(
        "  tables: {} · columns: {} · indexes: {}",
        snapshot.table_count(),
        snapshot.column_count(),
        snapshot.index_count()
    );
    println!("  snapshot: {}", snapshot_file.display());
    println!("  table docs created: {created_docs}");
    if !created_arch.is_empty() {
        println!("  architecture docs created: {}", created_arch.join(", "));
    }
    if history > 0 {
        println!("  history entries created: {history}");
    }
    println!(
        "\nNext: review the semantic sections marked \"needs verification\" and run `./db-knowledge sync` after schema changes."
    );
    Ok(())
}

// ── sync ────────────────────────────────────────────────────────────────────

async fn sync(cli: &Cli) -> Result<(), String> {
    let root = repo_root()?;
    let snapshot_file = snapshot_path(cli);
    let old = Snapshot::load(&snapshot_file)?.ok_or_else(|| {
        format!(
            "no snapshot at {} — run `./db-knowledge bootstrap` first",
            snapshot_file.display()
        )
    })?;
    let new = live_snapshot(cli).await?;

    let changes = diff_snapshots(&old, &new);
    if changes.is_empty() {
        println!("No schema changes detected.");
        if cli.check {
            std::process::exit(3);
        }
        return Ok(());
    }

    println!("{}", render_text(&changes));
    new.save(&snapshot_file)?;
    write_json(&relationships_json_path(cli), &relationship_graph(&new))?;

    let tables: Vec<String> = new.table_names().into_iter().map(|(_, t)| t).collect();
    let scan = scan_repo(&root, &tables)?;

    // Refresh generated blocks; create stub docs for new tables.
    let mut refreshed = 0usize;
    let mut created = 0usize;
    for (schema, table) in new.table_names() {
        let snap = new.table(&schema, &table).unwrap();
        let path = docs::table_doc_path(&cli.dir, &table);
        if path.exists() {
            if docs::update_generated_block(&path, &docs::render_generated_block(&table, snap))? {
                refreshed += 1;
            }
        } else if docs::write_table_doc(&cli.dir, &schema, &table, snap, &scan.candidates_for(&table), &today())? {
            created += 1;
        }
    }

    // Refresh generated sections of the architecture docs.
    refresh_generated_sections(cli, &new, &scan)?;

    println!("Snapshot updated: {}", snapshot_file.display());
    if refreshed > 0 {
        println!("Generated schema blocks refreshed: {refreshed}");
    }
    if created > 0 {
        println!("Stub table docs created: {created}");
    }

    // Staleness report.
    let stale = docs::stale_tables(&cli.dir, &new);
    let old_tables: Vec<String> = old.table_names().into_iter().map(|(_, t)| t).collect();
    let new_tables: Vec<String> = new.table_names().into_iter().map(|(_, t)| t).collect();
    let removed: Vec<&String> = old_tables.iter().filter(|t| !new_tables.contains(t)).collect();

    if !stale.is_empty() {
        println!("\nSemantic documentation requires review:");
        for table in &stale {
            println!("  - {}/tables/{table}.md", cli.dir.display());
        }
        println!("  After reviewing, run `./db-knowledge verify <table>` to clear the flag.");
    }
    if !removed.is_empty() {
        println!("\nDocs exist for removed tables — write a history entry and remove them:");
        for table in removed {
            println!("  - {}/tables/{table}.md", cli.dir.display());
        }
    }

    if cli.check {
        std::process::exit(3);
    }
    Ok(())
}

fn refresh_generated_sections(
    cli: &Cli,
    snapshot: &Snapshot,
    scan: &crate::discover::ScanResult,
) -> Result<(), String> {
    let stats = render_stats_block(snapshot, &today());
    let schema_path = cli.dir.join("schema.md");
    if schema_path.exists() && !replace_marker_block(&schema_path, "stats", &stats)? {
        eprintln!(
            "note: {} has no generated markers — skipping stats refresh",
            schema_path.display()
        );
    }
    let fk_list = render_fk_list(snapshot);
    let relationships_path = cli.dir.join("relationships.md");
    if relationships_path.exists() && !replace_marker_block(&relationships_path, "fk-list", &fk_list)? {
        eprintln!(
            "note: {} has no generated markers — skipping FK refresh",
            relationships_path.display()
        );
    }
    let services_path = cli.dir.join("services.md");
    if services_path.exists() {
        let generated = extract_marker_block(&render_services_md(scan), "services");
        if let Some(body) = generated {
            if !replace_marker_block(&services_path, "services", &body)? {
                eprintln!(
                    "note: {} has no generated markers — skipping ownership refresh",
                    services_path.display()
                );
            }
        }
    }
    let flows_path = cli.dir.join("data-flows.md");
    if flows_path.exists() {
        let generated = extract_marker_block(&render_data_flows_md(scan), "flows");
        if let Some(body) = generated {
            if !replace_marker_block(&flows_path, "flows", &body)? {
                eprintln!(
                    "note: {} has no generated markers — skipping flow refresh",
                    flows_path.display()
                );
            }
        }
    }
    Ok(())
}

/// Extract the body between `BEGIN/END GENERATED: <name>` markers.
fn extract_marker_block(content: &str, name: &str) -> Option<String> {
    let begin = format!("<!-- BEGIN GENERATED: {name} -->");
    let end = format!("<!-- END GENERATED: {name} -->");
    let begin_idx = content.find(&begin)? + begin.len();
    let end_idx = content.find(&end)?;
    Some(content[begin_idx..end_idx].trim().to_string())
}

/// Replace `<!-- BEGIN GENERATED: <name> --> … <!-- END GENERATED: <name> -->`.
/// Returns `Ok(false)` when the markers are missing.
fn replace_marker_block(path: &Path, name: &str, body: &str) -> Result<bool, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let begin = format!("<!-- BEGIN GENERATED: {name} -->");
    let end = format!("<!-- END GENERATED: {name} -->");
    let (begin_idx, end_idx) = match (content.find(&begin), content.find(&end)) {
        (Some(b), Some(e)) => (b, e + end.len()),
        _ => return Ok(false),
    };
    let mut output = String::new();
    output.push_str(&content[..begin_idx]);
    output.push_str(&begin);
    output.push('\n');
    output.push_str(body.trim_end());
    output.push('\n');
    output.push_str(&end);
    output.push_str(&content[end_idx..]);
    std::fs::write(path, output).map_err(|e| format!("failed to write {}: {e}", path.display()))?;
    Ok(true)
}

// ── diff ────────────────────────────────────────────────────────────────────

async fn diff_cmd(cli: &Cli) -> Result<(), String> {
    let (old, new) = if cli.args.len() >= 2 {
        let a = Snapshot::load(Path::new(&cli.args[0]))?
            .ok_or_else(|| format!("snapshot not found: {}", cli.args[0]))?;
        let b = Snapshot::load(Path::new(&cli.args[1]))?
            .ok_or_else(|| format!("snapshot not found: {}", cli.args[1]))?;
        (a, b)
    } else {
        let old = Snapshot::load(&snapshot_path(cli))?.ok_or_else(|| {
            "no snapshot yet — run `./db-knowledge bootstrap` first".to_string()
        })?;
        let new = live_snapshot(cli).await?;
        (old, new)
    };

    let changes = diff_snapshots(&old, &new);
    if cli.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&changes).map_err(|e| e.to_string())?
        );
    } else {
        print!("{}", render_text(&changes));
    }
    Ok(())
}

// ── overview / table / search ───────────────────────────────────────────────

fn overview(cli: &Cli) -> Result<(), String> {
    let snapshot_file = snapshot_path(cli);
    match Snapshot::load(&snapshot_file)? {
        Some(snapshot) => {
            println!(
                "{} · PostgreSQL {} · {} tables · {} columns · {} indexes",
                snapshot.database.name,
                snapshot.database.server_version,
                snapshot.table_count(),
                snapshot.column_count(),
                snapshot.index_count()
            );
        }
        None => println!("No snapshot yet — run `./db-knowledge bootstrap`."),
    }
    let schema_md = cli.dir.join("schema.md");
    if schema_md.exists() {
        println!();
        print!("{}", std::fs::read_to_string(&schema_md).map_err(|e| e.to_string())?);
    }
    Ok(())
}

fn table_cmd(cli: &Cli) -> Result<(), String> {
    let table = cli
        .args
        .first()
        .ok_or_else(|| "usage: db-knowledge table <name>".to_string())?;
    let path = docs::table_doc_path(&cli.dir, table);
    if !path.exists() {
        return Err(format!(
            "no documentation for `{table}`. Try `./db-knowledge search {table}` or run `bootstrap`."
        ));
    }
    print!(
        "{}",
        std::fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))?
    );
    Ok(())
}

fn search_cmd(cli: &Cli) -> Result<(), String> {
    let term = cli
        .args
        .first()
        .ok_or_else(|| "usage: db-knowledge search <term>".to_string())?;
    let needle = term.to_lowercase();
    let tables_dir = cli.dir.join("tables");
    let mut results = 0usize;
    const MAX_RESULTS: usize = 40;
    const MAX_PER_FILE: usize = 3;

    if tables_dir.exists() {
        let mut files: Vec<PathBuf> = std::fs::read_dir(&tables_dir)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("md"))
            .collect();
        files.sort();
        for path in files {
            let table = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let content = match std::fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let mut hits = 0usize;
            for line in content.lines() {
                if results >= MAX_RESULTS || hits >= MAX_PER_FILE {
                    break;
                }
                if line.to_lowercase().contains(&needle) {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with("<!--") {
                        continue;
                    }
                    let display: String = trimmed.chars().take(160).collect();
                    println!("{table}: {display}");
                    hits += 1;
                    results += 1;
                }
            }
        }
    }

    for extra in ["schema.md", "services.md", "data-flows.md", "invariants.md", "debugging.md"] {
        if results >= MAX_RESULTS {
            break;
        }
        let path = cli.dir.join(extra);
        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for line in content.lines() {
            if results >= MAX_RESULTS {
                break;
            }
            if line.to_lowercase().contains(&needle) {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with("<!--") {
                    continue;
                }
                let display: String = trimmed.chars().take(160).collect();
                println!("{extra}: {display}");
                results += 1;
            }
        }
    }

    if results == 0 {
        println!("No matches for `{term}`.");
    }
    Ok(())
}

// ── relationships / domain / impact ─────────────────────────────────────────

fn load_relationships(cli: &Cli) -> Result<serde_json::Value, String> {
    let path = relationships_json_path(cli);
    let raw = std::fs::read_to_string(&path).map_err(|_| {
        format!(
            "{} missing — run `./db-knowledge sync` (or bootstrap) first",
            path.display()
        )
    })?;
    serde_json::from_str(&raw).map_err(|e| format!("failed to parse {}: {e}", path.display()))
}

fn relationships_cmd(cli: &Cli) -> Result<(), String> {
    let table = cli
        .args
        .first()
        .ok_or_else(|| "usage: db-knowledge relationships <table>".to_string())?;
    let graph = load_relationships(cli)?;
    let entry = graph.get(table).ok_or_else(|| {
        format!("`{table}` not found in the relationship graph — check the name with `search`")
    })?;
    println!("{table}");
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
    println!("  belongs to (FK parents): {}", if belongs.is_empty() { "—" } else { &belongs });
    println!("  referenced by (FK children): {}", if referenced.is_empty() { "—" } else { &referenced });
    Ok(())
}

fn domain_cmd(cli: &Cli) -> Result<(), String> {
    let path = domains_json_path(cli);
    let raw = std::fs::read_to_string(&path).map_err(|_| {
        format!("{} missing — run `./db-knowledge bootstrap` first", path.display())
    })?;
    let parsed: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| format!("failed to parse {}: {e}", path.display()))?;
    let obj = parsed
        .as_object()
        .ok_or_else(|| "domains.json must be an object".to_string())?;

    match cli.args.first() {
        None => {
            println!("Domains:");
            for (name, value) in obj {
                if name.starts_with('_') {
                    continue;
                }
                let count = value
                    .get("tables")
                    .and_then(|t| t.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);
                println!("  {name} ({count} tables)");
            }
        }
        Some(name) => {
            let entry = obj.get(name.as_str()).ok_or_else(|| {
                format!("domain `{name}` not found — run without arguments to list domains")
            })?;
            println!("# domain: {name}");
            if let Some(desc) = entry.get("description").and_then(|d| d.as_str()) {
                println!("{desc}\n");
            }
            if let Some(tables) = entry.get("tables").and_then(|t| t.as_array()) {
                for table in tables {
                    if let Some(t) = table.as_str() {
                        println!("- {t}");
                    }
                }
            }
        }
    }
    Ok(())
}

fn impact_cmd(cli: &Cli) -> Result<(), String> {
    let table = cli
        .args
        .first()
        .ok_or_else(|| "usage: db-knowledge impact <table>".to_string())?;
    let graph = load_relationships(cli)?;
    if let Some(entry) = graph.get(table) {
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
        println!("{table}");
        println!("  FK parents: {}", if belongs.is_empty() { "—" } else { &belongs });
        println!("  FK children: {}", if referenced.is_empty() { "—" } else { &referenced });
    } else {
        println!("{table}: not present in the relationship graph");
    }

    let root = repo_root()?;
    let tables = vec![table.clone()];
    if let Ok(scan) = scan_repo(&root, &tables) {
        let candidates = scan.candidates_for(table);
        if candidates.is_empty() {
            println!("  code references: none found");
        } else {
            println!("  code references (inferred — needs verification):");
            for (file, count) in candidates.iter().take(8) {
                println!("    - {file} ({count} refs)");
            }
        }
        let writers = scan.likely_writers(table);
        if !writers.is_empty() {
            println!(
                "  likely writers (heuristic — needs verification): {}",
                writers.join(", ")
            );
        }
    }
    Ok(())
}

// ── changed / verify ────────────────────────────────────────────────────────

fn changed_cmd(cli: &Cli) -> Result<(), String> {
    let root = repo_root()?;
    let working = Snapshot::load(&snapshot_path(cli))?;
    let rel = snapshot_path(cli)
        .strip_prefix(&root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|_| snapshot_path(cli).to_string_lossy().replace('\\', "/"));

    let output = Command::new("git")
        .args(["show", &format!("HEAD:{rel}")])
        .current_dir(&root)
        .output();

    match (output, &working) {
        (Ok(out), Some(working)) if out.status.success() => {
            let head_raw = String::from_utf8_lossy(&out.stdout);
            match serde_json::from_str::<Snapshot>(&head_raw) {
                Ok(head) => {
                    let changes = diff_snapshots(&head, working);
                    if changes.is_empty() {
                        println!("No uncommitted schema changes (working snapshot matches HEAD).");
                    } else {
                        println!("Uncommitted schema changes (HEAD -> working snapshot):\n");
                        print!("{}", render_text(&changes));
                    }
                }
                Err(e) => println!("Could not parse committed snapshot: {e}"),
            }
        }
        _ => println!("No committed snapshot found at HEAD:{rel}."),
    }

    let history_dir = cli.dir.join("history");
    if history_dir.exists() {
        let mut entries: Vec<PathBuf> = std::fs::read_dir(&history_dir)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("md"))
            .collect();
        entries.sort();
        if !entries.is_empty() {
            println!("\nRecent history:");
            for path in entries.iter().rev().take(3) {
                let name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let first_line = std::fs::read_to_string(path)
                    .ok()
                    .and_then(|c| {
                        c.lines()
                            .find(|l| !l.trim().is_empty() && !l.trim().starts_with('#'))
                            .map(|l| l.trim().to_string())
                    })
                    .unwrap_or_default();
                println!("  - {name}: {first_line}");
            }
        }
    }
    Ok(())
}

async fn verify_cmd(cli: &Cli) -> Result<(), String> {
    let table = cli
        .args
        .first()
        .ok_or_else(|| "usage: db-knowledge verify <table>".to_string())?;
    let path = docs::table_doc_path(&cli.dir, table);
    if !path.exists() {
        return Err(format!("no documentation for `{table}` at {}", path.display()));
    }
    let snapshot = live_snapshot(cli).await?;
    let snap = snapshot
        .table("public", table)
        .or_else(|| {
            snapshot
                .schemas
                .values()
                .find_map(|s| s.tables.get(table))
        })
        .ok_or_else(|| format!("table `{table}` not found in the live database"))?;

    docs::set_front_matter_key(&path, "schema_hash", &crate::snapshot::table_hash(snap))?;
    docs::set_front_matter_key(&path, "last_schema_verified", &today())?;
    if cli.documented {
        docs::set_front_matter_key(&path, "semantic_confidence", "documented")?;
    }
    println!(
        "Verified {}. Structural hash refreshed{}. Review the semantic sections before relying on them.",
        path.display(),
        if cli.documented {
            " and marked semantic_confidence: documented"
        } else {
            ""
        }
    );
    Ok(())
}

// ── generated architecture documents ────────────────────────────────────────

fn render_stats_block(snapshot: &Snapshot, today: &str) -> String {
    let schemas = snapshot
        .schemas
        .keys()
        .cloned()
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "## Database\n\n\
         - Database: `{}`\n\
         - Server: PostgreSQL {}\n\
         - Schemas: {schemas}\n\
         - Tables: {} · Columns: {} · Indexes: {}\n\
         - Snapshot format: {} · Generated: {today}",
        snapshot.database.name,
        snapshot.database.server_version,
        snapshot.table_count(),
        snapshot.column_count(),
        snapshot.index_count(),
        snapshot.format_version,
    )
}

fn hub_tables(snapshot: &Snapshot) -> Vec<(String, usize)> {
    let graph = relationship_graph(snapshot);
    let mut hubs: Vec<(String, usize)> = graph
        .as_object()
        .map(|obj| {
            obj.iter()
                .map(|(table, entry)| {
                    let belongs = entry
                        .get("belongs_to")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    let referenced = entry
                        .get("referenced_by")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    (table.clone(), belongs + referenced)
                })
                .collect()
        })
        .unwrap_or_default();
    hubs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    hubs.truncate(10);
    hubs
}

fn render_schema_md(snapshot: &Snapshot, _scan: &crate::discover::ScanResult, today: &str) -> String {
    let mut out = String::new();
    out.push_str("# Database Architecture\n\n");
    out.push_str(
        "> Structural facts are generated from the live database; refresh with\n\
         > `./db-knowledge sync`. Domains are curated in `domains.json`.\n\n",
    );
    out.push_str("<!-- BEGIN GENERATED: stats -->\n");
    out.push_str(&render_stats_block(snapshot, today));
    out.push_str("\n<!-- END GENERATED: stats -->\n\n");

    out.push_str("## Purpose\n\n");
    out.push_str(
        "PostgreSQL relational state for the RJ Agro poultry operations platform:\n\
         farms and batches, inventory and allocations, purchases, sales, trader and\n\
         supplier accounts, double-entry ledger, loans, expenses and stored metrics.\n\
         The live database is the source of truth for structural facts; this\n\
         knowledge base records their meaning (curate the sections below).\n\n",
    );

    out.push_str("## Domains\n\n");
    out.push_str(
        "Domains group tables by business area and are curated in `domains.json`.\n\
         List them with `./db-knowledge domain <name>`.\n\n",
    );

    out.push_str("## Key tables (generated — verify)\n\n");
    out.push_str("Most connected tables by foreign keys:\n\n");
    for (table, score) in hub_tables(snapshot) {
        let _ = writeln!(out, "- `{table}` ({score} FK connections)");
    }

    out.push_str("\n## Important relationships\n\n");
    out.push_str("See `database/relationships.md` (human view) and `database/relationships.json` (machine-readable).\n\n");

    out.push_str("## For Agents\n\n");
    out.push_str(
        "1. Run `./db-knowledge overview` for this page.\n\
         2. `./db-knowledge search <term>` to find candidate tables.\n\
         3. `./db-knowledge table <name>` for one table's doc.\n\
         4. `./db-knowledge relationships <name>` / `impact <name>` for blast radius.\n\
         5. Verify structural facts against the live database before acting.\n",
    );
    out
}

fn render_relationships_md(snapshot: &Snapshot) -> String {
    let mut out = String::new();
    out.push_str("# Relationships\n\n");
    out.push_str(
        "> The foreign-key list is generated; refresh it with `./db-knowledge sync`.\n\
         > Add curated, non-FK relationships below the generated block.\n\n",
    );
    out.push_str("<!-- BEGIN GENERATED: fk-list -->\n");
    out.push_str("## Foreign keys (generated)\n\n");
    out.push_str(&render_fk_list(snapshot));
    out.push_str("<!-- END GENERATED: fk-list -->\n\n");
    out.push_str("## Curated relationships\n\n");
    out.push_str(
        "Document logical (non-FK) links here, for example ledger entries that point\n\
         at source rows through `reference_table` / `reference_id`, or payments that\n\
         are recorded in separate tables for legacy and app traders.\n",
    );
    out
}

fn render_invariants_md() -> String {
    r#"# Important Invariants

> Candidates discovered from code and schema structure. Each one is marked
> **needs verification** until its SQL check has been run against the live
> database. Only keep invariants that hold; record failures as debugging notes.

## INV-1 — Ledger entries balance per transaction group

**Statement:** For every `ledger_entries.txn_group_id`, total debits equal total credits.

**Evidence:** `src/handlers/traders.rs`, `src/handlers/batch_sales.rs`, `src/handlers/purchases.rs` write paired entries per transaction.

**Verification SQL:**

```sql
SELECT txn_group_id
FROM ledger_entries
GROUP BY txn_group_id
HAVING SUM(COALESCE(debit, 0)) <> SUM(COALESCE(credit, 0));
```

**Status:** needs verification

## INV-2 — Inventory equals receipts minus allocations plus returns

**Statement:** `inventory.current_qty` matches the movement history.

**Evidence:** `stock_receipts`, `batch_allocation_lines`, `stock_returns`, `inventory_movements`.

**Verification SQL:**

```sql
SELECT i.item_code,
       i.current_qty,
       COALESCE(r.received, 0) - COALESCE(a.allocated, 0) + COALESCE(s.returned, 0) AS computed
FROM inventory i
LEFT JOIN (SELECT item_code, SUM(received_qty) AS received FROM stock_receipts GROUP BY item_code) r USING (item_code)
LEFT JOIN (SELECT sr.item_code, SUM(bal.qty) AS allocated
           FROM batch_allocation_lines bal JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
           GROUP BY sr.item_code) a USING (item_code)
LEFT JOIN (SELECT sr.item_code, SUM(srt.return_qty) AS returned
           FROM stock_returns srt JOIN batch_allocation_lines bal ON bal.allocation_line_id = srt.allocation_line_id
           JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
           GROUP BY sr.item_code) s USING (item_code)
WHERE i.current_qty <> COALESCE(r.received, 0) - COALESCE(a.allocated, 0) + COALESCE(s.returned, 0);
```

**Status:** needs verification

## INV-3 — Batch closure revenue equals recorded sales

**Statement:** `batch_closure_summary.revenue` equals the sum of `batch_sales.value` for the batch.

**Evidence:** `src/handlers/metrics.rs`, commit `be79691` (closure revenue computed from recorded sales).

**Verification SQL:**

```sql
SELECT bcs.batch_id, bcs.revenue, s.total
FROM batch_closure_summary bcs
JOIN (SELECT batch_id, SUM(value) AS total FROM batch_sales GROUP BY batch_id) s USING (batch_id)
WHERE bcs.revenue <> s.total;
```

**Status:** needs verification

## INV-4 — Trader amount due formula

**Statement:** `amount_due = SUM(batch_sales.value WHERE payment_type='RECEIVABLE') − SUM(trader_payments.amount)`.

**Evidence:** `src/handlers/fetch_all.rs` (`get_traders_handler`).

**Verification SQL:**

```sql
SELECT t.trader_id,
       COALESCE(s.total, 0) - COALESCE(p.paid, 0) AS amount_due
FROM traders t
LEFT JOIN (SELECT trader_id, SUM(value) AS total FROM batch_sales WHERE payment_type = 'RECEIVABLE' GROUP BY trader_id) s USING (trader_id)
LEFT JOIN (SELECT trader_id, SUM(amount) AS paid FROM trader_payments GROUP BY trader_id) p USING (trader_id);
```

**Status:** needs verification

## How to add an invariant

1. State it in one sentence and cite the evidence (file path or commit).
2. Include a verification query that returns offending rows.
3. Run it; record the result and the date; only then mark it verified.
"#
    .to_string()
}

fn render_debugging_md() -> String {
    r#"# Debugging Playbooks

> Only persist a debugging rule when there is evidence (code, data or a
> reproduced failure). Each entry should say what to check and why.

## General workflow

1. `./db-knowledge search <symptom>` to find the relevant tables.
2. `./db-knowledge table <name>` and `./db-knowledge relationships <name>`.
3. Check `database/invariants.md` for rules that should hold.
4. Verify structural facts against the live database (the snapshot can lag).
5. Query real data, then record new findings here with evidence.

## Known failure modes

### Payments and receivables card shows ₹0 in the Overview

**Cause (fixed):** the frontend compared `payment_type` against uppercase DB
values (`'RECEIVABLE'`) while the API serializes Rust enums as variant names
(`"Receivable"`), so every row was filtered out.

**Evidence:** `rjagro_frontend/app/components/v2/overview_module.tsx`
(`isPaymentType`), `entity/src/sea_orm_active_enums.rs`.

**Check:** `SELECT payment_type, COUNT(*) FROM batch_sales GROUP BY 1;` then
inspect the API response casing.

### Negative `amount_due` for a trader

**Cause:** overpayment. `amount_due` can legitimately go negative when payments
exceed receivable sales; the traders list colors negative balances green.

**Evidence:** `src/handlers/fetch_all.rs` (`get_traders_handler`).

**Check:** compare per-trader sums of `batch_sales.value` and
`trader_payments.amount`; look for rounded-up final payments.

### All `batch_sales.sale_date` values are the same placeholder date

**Cause:** `batch_sales.sale_date` defaults to `2026-01-01` and is not always
set by the sale form; use `created_at` for real timing.

**Evidence:** `batch_sales.sale_date` column default; Overview charts use
`created_at`.

**Check:** `SELECT sale_date, COUNT(*) FROM batch_sales GROUP BY 1 ORDER BY 2 DESC;`

## Adding a debugging note

Record: symptom → what to check (ordered) → evidence → date verified.
"#
    .to_string()
}

fn render_readme_md(snapshot: &Snapshot, today: &str) -> String {
    format!(
        r#"# Database Knowledge

Persistent, version-controlled understanding of the `{db}` PostgreSQL database.
It complements — never replaces — the live database.

- **Live database** = source of truth for structural facts (tables, columns, keys, indexes).
- **This directory** = accumulated semantic knowledge: meaning, ownership, flows, invariants, debugging notes and change history.

Generated {today} from `{db}` (PostgreSQL {version}, {tables} tables).

## Structure

| Path | Contents |
|---|---|
| `schema.md` | Concise database/domain map — start here |
| `relationships.md` / `relationships.json` | Foreign-key graph (human + machine) |
| `services.md` | Which code owns/reads which tables (inferred, needs verification) |
| `data-flows.md` | How data moves through tables |
| `invariants.md` | Rules that should always hold, with verification SQL |
| `debugging.md` | Playbooks and known failure modes |
| `domains.json` | Curated domain → tables mapping |
| `tables/<table>.md` | One document per table |
| `schema-snapshot/current.json` | Deterministic schema snapshot |
| `history/` | Meaningful schema/architecture changes |

## Commands

```bash
./db-knowledge overview              # database + domain map
./db-knowledge search <term>         # find tables (low-context output)
./db-knowledge table <name>          # one table's doc
./db-knowledge relationships <name>  # FK parents/children
./db-knowledge impact <name>         # reverse FKs + code references
./db-knowledge domain <name>         # tables in a domain
./db-knowledge diff                  # live schema vs snapshot
./db-knowledge sync                  # refresh snapshot, flag stale docs
./db-knowledge changed               # uncommitted schema changes + recent history
./db-knowledge verify <name>         # mark a table doc reviewed
./db-knowledge bootstrap             # initial generation (or --force to re-run)
```

All commands are read-only against the application database. `bootstrap`,
`sync` and `verify` only write inside this directory.

## Source of truth

1. Structural facts come from the live database via `sync` — never hand-edit
   `schema-snapshot/current.json` or the `GENERATED` block in a table doc.
2. Semantic prose is hand-written and never overwritten by tooling.
3. If documentation conflicts with the database or runtime behavior, trust the
   database/behavior and update the docs.

## Staleness

Every table doc front matter records `schema_hash` + `last_schema_verified`.
When `sync` detects a structural change it refreshes the generated block and
reports the doc as **requires review**. After reviewing the semantics, run
`./db-knowledge verify <table>` (add `--documented` once the prose is confirmed).

## Schema changes

There is no migration framework in this repo: changes are applied with SQL
files (`*_schema_additions.sql`, `backup.sql` for fresh installs) and recorded
in `seaql_migrations`. Workflow:

```text
write/apply SQL  →  ./db-knowledge sync  →  review flagged docs  →  update semantics  →  git commit (SQL + database/)
```

Add a `history/YYYY-MM-DD-<slug>.md` entry for meaningful changes.

## For Agents

1. Read `schema.md` first; do not load every table doc.
2. `search` → read 2–5 relevant table docs → query the live DB to verify.
3. Follow `relationships`/`impact` for blast radius and `invariants` for rules.
4. After any schema change, run `sync`, review the flagged docs and update the
   semantic sections; mark them with `verify`.
5. Never invent business meaning — write `Unknown — needs verification` instead.
"#,
        db = snapshot.database.name,
        version = snapshot.database.server_version,
        tables = snapshot.table_count(),
        today = today,
    )
}

fn render_bootstrap_history(snapshot: &Snapshot, today: &str) -> String {
    format!(
        r#"# {today} — Knowledge base bootstrapped

## Change

Created the persistent database knowledge base from the live `{db}` database
(PostgreSQL {version}): {tables} tables, {columns} columns, {indexes} indexes.

## Reason

Agents were rediscovering the same schema, relationships and invariants in every
session. This knowledge base records them once and is refreshed with
`./db-knowledge sync`.

## Impact

Documentation only; no application or schema changes.

## Migration

None — initial bootstrap.
"#,
        db = snapshot.database.name,
        version = snapshot.database.server_version,
        tables = snapshot.table_count(),
        columns = snapshot.column_count(),
        indexes = snapshot.index_count(),
    )
}

/// Create history entries for the repo's SQL schema-addition files.
fn write_sql_history(root: &Path, cli: &Cli) -> Result<usize, String> {
    let candidates = [
        "trader_schema_additions.sql",
        "batch_sales_app_trader_additions.sql",
        "purchase_orders_schema_additions.sql",
        "metrics_schema_additions.sql",
    ];
    let mut created = 0usize;
    for file in candidates {
        let path = root.join(file);
        if !path.exists() {
            continue;
        }
        let date = git_date(root, file).unwrap_or_else(today);
        let slug = file.trim_end_matches(".sql").replace('_', "-");
        let history_path = cli.dir.join("history").join(format!("{date}-{slug}.md"));
        if history_path.exists() {
            continue;
        }
        let changes = summarize_sql(&path);
        let mut body = String::new();
        let _ = writeln!(body, "# {date} — {file}\n");
        let _ = writeln!(body, "## Change\n");
        if changes.is_empty() {
            let _ = writeln!(body, "Schema additions (see `{file}`).\n");
        } else {
            for change in changes {
                let _ = writeln!(body, "- {change}");
            }
            body.push('\n');
        }
        let _ = writeln!(body, "## Reason\n\nUnknown — see `{file}` and git history.\n");
        let _ = writeln!(body, "## Impact\n\nDocumentation generated during bootstrap; verify against the live database.\n");
        let _ = writeln!(body, "## Migration\n\n`{file}`");
        if write_if_missing(&history_path, &body)? {
            created += 1;
        }
    }
    Ok(created)
}

fn git_date(root: &Path, file: &str) -> Option<String> {
    let output = Command::new("git")
        .args(["log", "-1", "--format=%ad", "--date=short", "--", file])
        .current_dir(root)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn summarize_sql(path: &Path) -> Vec<String> {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::new();
    let mut last_alter_table: Option<String> = None;
    for line in content.lines() {
        let trimmed = line.trim();
        let upper = trimmed.to_uppercase();
        if upper.starts_with("CREATE TABLE") {
            if let Some(name) = sql_name(trimmed, "CREATE TABLE") {
                out.push(format!("Added table `{name}`"));
            }
        } else if upper.starts_with("ALTER TABLE") {
            if let Some(rest) = split_keyword(trimmed, "ALTER TABLE") {
                let table = rest
                    .split_whitespace()
                    .next()
                    .unwrap_or("")
                    .trim_matches('"')
                    .to_string();
                last_alter_table = Some(table.clone());
                if let Some(column) = find_column(rest) {
                    out.push(format!("Added column `{table}.{column}`"));
                } else if upper.contains("ADD CONSTRAINT") {
                    out.push(format!("Added constraint on `{table}`"));
                }
            }
        } else if upper.starts_with("ADD COLUMN") {
            // Multi-line ALTER TABLE statements.
            if let Some(table) = &last_alter_table {
                if let Some(column) = find_column(trimmed) {
                    out.push(format!("Added column `{table}.{column}`"));
                }
            }
        } else if upper.starts_with("CREATE TYPE") {
            if let Some(name) = sql_name(trimmed, "CREATE TYPE") {
                out.push(format!("Added enum `{name}`"));
            }
        } else if upper.starts_with("CREATE INDEX") || upper.starts_with("CREATE UNIQUE INDEX") {
            let keyword = if upper.starts_with("CREATE UNIQUE INDEX") {
                "CREATE UNIQUE INDEX"
            } else {
                "CREATE INDEX"
            };
            if let Some(name) = sql_name(trimmed, keyword) {
                out.push(format!("Added index `{name}`"));
            }
        }
    }
    out
}

fn split_keyword<'a>(line: &'a str, keyword: &str) -> Option<&'a str> {
    let idx = line.to_uppercase().find(keyword)?;
    Some(line[idx + keyword.len()..].trim_start())
}

fn find_column(rest: &str) -> Option<String> {
    let upper = rest.to_uppercase();
    let idx = upper.find("ADD COLUMN")?;
    let mut after = rest[idx + "ADD COLUMN".len()..].trim_start();
    if after.to_uppercase().starts_with("IF NOT EXISTS") {
        after = after["IF NOT EXISTS".len()..].trim_start();
    }
    let name = after
        .split_whitespace()
        .next()?
        .trim_matches('"')
        .to_string();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

fn sql_name(line: &str, keyword: &str) -> Option<String> {
    let rest = split_keyword(line, keyword)?;
    let rest = rest
        .strip_prefix("IF NOT EXISTS")
        .map(str::trim_start)
        .unwrap_or(rest);
    let name = rest
        .split(|c: char| c.is_whitespace() || c == '(')
        .next()?
        .trim_matches('"')
        .trim_start_matches("public.");
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    #[test]
    fn summarizes_sql_additions() {
        let dir = std::env::temp_dir().join(format!("dbk-sql-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("additions.sql");
        std::fs::write(
            &path,
            "CREATE TABLE IF NOT EXISTS trader_ledger_entries (id int);\n\
             ALTER TABLE users ADD COLUMN phone varchar(15);\n\
             CREATE TYPE payment_mode AS ENUM ('cash','bank');\n\
             CREATE INDEX idx_tle_trader ON trader_ledger_entries (trader_id);\n",
        )
        .unwrap();
        let summary = summarize_sql(&path);
        assert!(summary.contains(&"Added table `trader_ledger_entries`".to_string()));
        assert!(summary.contains(&"Added column `users.phone`".to_string()));
        assert!(summary.contains(&"Added enum `payment_mode`".to_string()));
        assert!(summary.contains(&"Added index `idx_tle_trader`".to_string()));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn summarizes_if_not_exists_and_multiline_alter() {
        let dir = std::env::temp_dir().join(format!("dbk-sql2-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("additions.sql");
        std::fs::write(
            &path,
            "ALTER TABLE batch_sales ADD COLUMN IF NOT EXISTS app_trader_id integer;\n\
             ALTER TABLE purchases\n\
                 ADD COLUMN IF NOT EXISTS purchase_order_id integer;\n",
        )
        .unwrap();
        let summary = summarize_sql(&path);
        assert!(summary.contains(&"Added column `batch_sales.app_trader_id`".to_string()));
        assert!(summary.contains(&"Added column `purchases.purchase_order_id`".to_string()));
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn stats_block_contains_counts() {
        let snapshot = Snapshot {
            format_version: 1,
            database: crate::snapshot::DatabaseInfo {
                name: "rjagro".to_string(),
                server_version: "16.11".to_string(),
            },
            schemas: BTreeMap::new(),
        };
        let block = render_stats_block(&snapshot, "2026-09-18");
        assert!(block.contains("Database: `rjagro`"));
        assert!(block.contains("Tables: 0"));
    }
}
