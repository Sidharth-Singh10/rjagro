use axum::http::{self, HeaderValue};
use axum::routing::post;
use axum::{routing::get, Router};
use reqwest::Method;
use sea_orm::{Database, DatabaseConnection};
use tower_http::cors::CorsLayer;
use tracing::{error, info};
mod auth;
mod consts;
mod handlers;
mod models;
mod pdf;
mod routes;
use crate::auth::login::login_handler;
use crate::auth::trader_login::{trader_login_handler, trader_register_handler};
use crate::handlers::visibility::get_visibility_handler;
use crate::routes::admin::admin::admin;
use crate::routes::audit_app::audit_routes;
use crate::routes::deletes::delete_routes;
use crate::routes::fetch_by_id::fetch_by_id;
use crate::routes::inserts::insert_routes;
use crate::routes::ledger_app::ledger_routes;
use crate::routes::supervisor_app::supervisor_app_routes;
use crate::routes::trader_app::trader_app_routes;
use crate::{auth::middleware::auth_middleware, routes::fetch_all::fetch_all};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing subscriber (use RUST_LOG to set level, e.g. RUST_LOG=info)
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting application...");

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL missing")
        .trim()
        .to_string();

    // Connect to DB
    let db: DatabaseConnection = match Database::connect(&database_url).await {
        Ok(conn) => {
            info!("✅ Successfully connected to database");
            conn
        }
        Err(e) => {
            error!("❌ Failed to connect to database: {:?}", e);
            panic!("Database connection failed: {:?}", e);
        }
    };

    let mut allowed_origins: Vec<String> = vec![
        "http://tauri.localhost",
        "https://tauri.localhost",
        "https://rjagro.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:1420",
        "http://100.79.53.70:1420",
        "http://localhost:1421",
        "http://100.79.53.70:1421",
    ]
    .into_iter()
    .map(String::from)
    .collect();

    // Allow additional origins via env var (comma-separated URLs) —
    // useful for testing on mobile devices, Tailscale, or staging environments.
    if let Ok(extra) = std::env::var("CORS_EXTRA_ORIGINS") {
        for origin in extra.split(',') {
            let trimmed = origin.trim().to_string();
            if !trimmed.is_empty() {
                allowed_origins.push(trimmed);
            }
        }
    }

    let cors = CorsLayer::new()
        .allow_origin(
            allowed_origins
                .iter()
                .map(|o| o.parse::<HeaderValue>().unwrap())
                .collect::<Vec<_>>(),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::OPTIONS,
            Method::DELETE,
        ])
        .allow_headers([
            http::header::CONTENT_TYPE,
            http::header::ACCEPT,
            http::header::AUTHORIZATION,
        ])
        .allow_credentials(true);

    let router = Router::new()
        .nest("/admin", admin())
        .nest("/getall", fetch_all())
        .nest("/getbyid", fetch_by_id())
        .nest("/insert", insert_routes())
        .nest("/delete", delete_routes())
        .nest("/trader", trader_app_routes())
        .nest("/supervisor", supervisor_app_routes())
        .nest("/ledger", ledger_routes())
        .merge(audit_routes())
        .route("/visibility", get(get_visibility_handler))
        // .route("/generate", post(generate))
        .layer(axum::middleware::from_fn(auth_middleware))
        .route("/login", post(login_handler))
        .route("/trader/login", post(trader_login_handler))
        .route("/trader/register", post(trader_register_handler))
        .with_state(db)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, router).await.unwrap();

    Ok(())
}
