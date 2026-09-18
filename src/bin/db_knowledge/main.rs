//! db-knowledge — persistent database knowledge tooling for the rjagro repo.
//!
//! The live PostgreSQL database is the source of truth for structural facts.
//! This tool introspects it into a deterministic snapshot and maintains a
//! version-controlled knowledge base under `database/` that adds semantic
//! meaning, relationships, ownership, flows, invariants and debugging notes.
//!
//! All commands are read-only against the application database. Only
//! `bootstrap`, `sync` and `verify` write files, and only inside `database/`.

mod commands;
mod db;
mod diff;
mod discover;
mod docs;
mod introspect;
mod snapshot;

use std::path::PathBuf;

pub const DEFAULT_DIR: &str = "database";

pub struct Cli {
    pub command: String,
    pub args: Vec<String>,
    pub dir: PathBuf,
    pub json: bool,
    pub check: bool,
    pub force: bool,
    pub documented: bool,
    pub schemas: Vec<String>,
}

#[tokio::main]
async fn main() {
    let cli = match parse_args() {
        Ok(Some(cli)) => cli,
        Ok(None) => {
            print_help();
            return;
        }
        Err(e) => {
            eprintln!("error: {e}");
            eprintln!();
            print_help();
            std::process::exit(2);
        }
    };

    if let Err(e) = commands::run(&cli).await {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

fn parse_args() -> Result<Option<Cli>, String> {
    let mut positional: Vec<String> = Vec::new();
    let mut dir = PathBuf::from(DEFAULT_DIR);
    let mut json = false;
    let mut check = false;
    let mut force = false;
    let mut documented = false;
    let mut schemas = vec!["public".to_string()];

    let mut it = std::env::args().skip(1);
    while let Some(arg) = it.next() {
        match arg.as_str() {
            "--dir" => dir = PathBuf::from(it.next().ok_or("--dir requires a path")?),
            "--json" => json = true,
            "--check" => check = true,
            "--force" => force = true,
            "--documented" => documented = true,
            "--schemas" => {
                schemas = it
                    .next()
                    .ok_or("--schemas requires a comma-separated list")?
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();
            }
            "-h" | "--help" => return Ok(None),
            other if other.starts_with("--") => return Err(format!("unknown flag: {other}")),
            other => positional.push(other.to_string()),
        }
    }

    if positional.is_empty() {
        return Ok(None);
    }

    let command = positional.remove(0);
    Ok(Some(Cli {
        command,
        args: positional,
        dir,
        json,
        check,
        force,
        documented,
        schemas,
    }))
}

fn print_help() {
    println!(
        r#"db-knowledge — persistent database knowledge for rjagro

USAGE
    db-knowledge <command> [args] [flags]

COMMANDS
    bootstrap              Build the initial knowledge base from the live DB + codebase
    sync                   Introspect, diff, update the snapshot and report stale docs
    diff [a.json b.json]   Show schema changes (live vs snapshot, or two snapshots)
    overview               Concise database/domain map
    table <name>           Print one table's documentation
    search <term>          Search table docs (progressive, low-context output)
    relationships <table>  Foreign-key parents and children
    domain <name>          Tables in a curated domain
    impact <table>         Reverse FKs + code references
    changed                Schema drift not yet committed + recent history
    verify <table>         Mark a table doc as reviewed (refresh schema hash)

FLAGS
    --dir <path>           Knowledge directory (default: database)
    --schemas a,b          Schemas to introspect (default: public)
    --json                 Machine-readable output where supported
    --check                Exit non-zero when sync detects schema drift
    --force                Allow bootstrap to re-run over an existing knowledge base

The live database is authoritative for structural facts. Semantic documentation
is authoritative for context, but verify it against code or runtime behavior
when it conflicts."#
    );
}
