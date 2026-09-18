//! Database connection helpers.
//!
//! `DATABASE_URL` comes from the environment, falling back to the repo's
//! `.env`. Credentials are never printed: `redact` strips the password from
//! any URL that ends up in output or error messages.

use sea_orm::{Database, DatabaseConnection};
use std::path::Path;

pub async fn connect(repo_root: &Path) -> Result<DatabaseConnection, String> {
    let url = database_url(repo_root)?;
    Database::connect(&url)
        .await
        .map_err(|e| format!("failed to connect to {}: {e}", redact(&url)))
}

pub fn database_url(repo_root: &Path) -> Result<String, String> {
    if let Ok(value) = std::env::var("DATABASE_URL") {
        let value = value.trim().to_string();
        if !value.is_empty() {
            return Ok(value);
        }
    }

    let env_path = repo_root.join(".env");
    if let Ok(content) = std::fs::read_to_string(&env_path) {
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with('#') {
                continue;
            }
            if let Some(rest) = line.strip_prefix("DATABASE_URL=") {
                let value = rest
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string();
                if !value.is_empty() {
                    return Ok(value);
                }
            }
        }
    }

    Err("DATABASE_URL not found in the environment or .env".to_string())
}

/// Replace the password in `scheme://user:password@host` with `***`.
pub fn redact(url: &str) -> String {
    if let Some(scheme_end) = url.find("://") {
        let rest = &url[scheme_end + 3..];
        if let Some(at) = rest.rfind('@') {
            let userinfo = &rest[..at];
            let host = &rest[at..];
            if let Some(colon) = userinfo.find(':') {
                return format!("{}://{}:***{}", &url[..scheme_end], &userinfo[..colon], host);
            }
        }
    }
    url.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_password() {
        assert_eq!(
            redact("postgresql://rjagro:secret@127.0.0.1:5432/rjagro"),
            "postgresql://rjagro:***@127.0.0.1:5432/rjagro"
        );
    }

    #[test]
    fn leaves_credential_free_urls_alone() {
        assert_eq!(
            redact("postgresql://127.0.0.1:5432/rjagro"),
            "postgresql://127.0.0.1:5432/rjagro"
        );
    }
}
