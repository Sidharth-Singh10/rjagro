use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use entity::app_traders;
use rand::RngCore;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    QueryFilter,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tracing::error;

use super::jwt::encode_trader_jwt;

// ─── App-level shared state ──────────────────────────────────────────────────
#[derive(Clone)]
pub struct GoogleAuthState {
    pub db: DatabaseConnection,
    pub pkce_store: PkceStore,
}

pub type PkceStore = Arc<Mutex<HashMap<String, String>>>;

pub fn new_google_auth_state(db: DatabaseConnection) -> GoogleAuthState {
    GoogleAuthState {
        db,
        pkce_store: Arc::new(Mutex::new(HashMap::new())),
    }
}

// ─── Query param structs ─────────────────────────────────────────────────────
#[derive(Deserialize)]
pub struct CallbackParams {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

// ─── Google token exchange response ─────────────────────────────────────────
#[derive(Deserialize, Debug)]
struct GoogleTokenResponse {
    id_token: String,
}

// ─── Google ID token payload ─────────────────────────────────────────────────
#[derive(Deserialize, Debug)]
struct GoogleIdPayload {
    sub: String,
    email: String,
    name: String,
    picture: Option<String>,
}

// ─── Handler: GET /auth/google/login ────────────────────────────────────────
pub async fn google_login_handler(
    State(state): State<GoogleAuthState>,
) -> impl IntoResponse {
    let client_id = match std::env::var("GOOGLE_CLIENT_ID") {
        Ok(v) => v,
        Err(_) => {
            error!("GOOGLE_CLIENT_ID env var missing");
            return Redirect::to(&frontend_error_url("server_error")).into_response();
        }
    };
    let redirect_uri = match std::env::var("GOOGLE_REDIRECT_URI") {
        Ok(v) => v,
        Err(_) => {
            error!("GOOGLE_REDIRECT_URI env var missing");
            return Redirect::to(&frontend_error_url("server_error")).into_response();
        }
    };

    // Generate PKCE code_verifier (64 random bytes, base64url-encoded)
    let mut verifier_bytes = [0u8; 64];
    rand::thread_rng().fill_bytes(&mut verifier_bytes);
    let code_verifier = URL_SAFE_NO_PAD.encode(verifier_bytes);

    // code_challenge = BASE64URL(SHA256(code_verifier))
    let hash = Sha256::digest(code_verifier.as_bytes());
    let code_challenge = URL_SAFE_NO_PAD.encode(hash);

    // state nonce to prevent CSRF
    let mut state_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut state_bytes);
    let nonce = URL_SAFE_NO_PAD.encode(state_bytes);

    // Store verifier keyed by nonce
    {
        let mut store = state.pkce_store.lock().unwrap();
        store.insert(nonce.clone(), code_verifier);
    }

    let params = [
        ("client_id", client_id.as_str()),
        ("redirect_uri", redirect_uri.as_str()),
        ("response_type", "code"),
        ("scope", "openid email profile"),
        ("code_challenge_method", "S256"),
        ("code_challenge", code_challenge.as_str()),
        ("state", nonce.as_str()),
        ("access_type", "online"),
        ("prompt", "select_account"),
    ];

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?{}",
        serde_urlencoded::to_string(&params).unwrap()
    );

    Redirect::temporary(&url).into_response()
}

// ─── Handler: GET /auth/google/callback ─────────────────────────────────────
pub async fn google_callback_handler(
    State(state): State<GoogleAuthState>,
    Query(params): Query<CallbackParams>,
) -> impl IntoResponse {
    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:1420".to_string());

    // User-denied consent
    if let Some(err) = params.error {
        return Redirect::temporary(&format!(
            "{}/auth/callback?error={}",
            frontend_url,
            urlencoding::encode(&err)
        ))
        .into_response();
    }

    let code = match params.code {
        Some(c) => c,
        None => return Redirect::temporary(&frontend_error_url("missing_code")).into_response(),
    };
    let nonce = match params.state {
        Some(s) => s,
        None => return Redirect::temporary(&frontend_error_url("missing_state")).into_response(),
    };

    // Retrieve and remove code_verifier (one-time use)
    let code_verifier = {
        let mut store = state.pkce_store.lock().unwrap();
        store.remove(&nonce)
    };
    let code_verifier = match code_verifier {
        Some(v) => v,
        None => return Redirect::temporary(&frontend_error_url("invalid_state")).into_response(),
    };

    // Exchange authorization code → Google tokens
    let google_payload = match exchange_code_for_payload(&code, &code_verifier).await {
        Ok(p) => p,
        Err(e) => {
            error!("Google token exchange failed: {e}");
            return Redirect::temporary(&frontend_error_url("token_exchange_failed"))
                .into_response();
        }
    };

    // Upsert trader in app_traders
    let trader = match upsert_trader(&state.db, &google_payload).await {
        Ok(t) => t,
        Err(e) => {
            error!("DB upsert failed: {e}");
            return Redirect::temporary(&frontend_error_url("db_error")).into_response();
        }
    };

    // Issue our own JWT
    let secret = match std::env::var("JWT_SECRET") {
        Ok(s) => s,
        Err(_) => {
            error!("JWT_SECRET missing");
            return Redirect::temporary(&frontend_error_url("server_error")).into_response();
        }
    };

    let token = match encode_trader_jwt(
        trader.id,
        &trader.name,
        &trader.email,
        google_payload.picture,
        &secret,
    ) {
        Ok(t) => t,
        Err(e) => {
            error!("JWT encode failed: {e}");
            return Redirect::temporary(&frontend_error_url("server_error")).into_response();
        }
    };

    // Redirect to frontend callback page with our JWT
    let redirect = format!(
        "{}/auth/callback?token={}",
        frontend_url,
        urlencoding::encode(&token)
    );
    Redirect::temporary(&redirect).into_response()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn frontend_error_url(reason: &str) -> String {
    let frontend_url = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:1420".to_string());
    format!(
        "{}/auth/callback?error={}",
        frontend_url,
        urlencoding::encode(reason)
    )
}

async fn exchange_code_for_payload(
    code: &str,
    code_verifier: &str,
) -> Result<GoogleIdPayload, Box<dyn std::error::Error + Send + Sync>> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")?;
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI")?;

    let client = reqwest::Client::new();

    let token_res: GoogleTokenResponse = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
            ("redirect_uri", &redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", code_verifier),
        ])
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    // Decode the JWT middle segment — no sig verification needed (Google verified it)
    let id_token = token_res.id_token;
    let payload_b64 = id_token.split('.').nth(1).ok_or("Malformed id_token")?;

    // Pad base64 to a multiple of 4
    let padding = (4 - payload_b64.len() % 4) % 4;
    let padded = format!("{}{}", payload_b64, "=".repeat(padding));
    let payload_bytes = base64::engine::general_purpose::STANDARD.decode(&padded)?;
    let payload: GoogleIdPayload = serde_json::from_slice(&payload_bytes)?;

    Ok(payload)
}

async fn upsert_trader(
    db: &DatabaseConnection,
    payload: &GoogleIdPayload,
) -> Result<app_traders::Model, sea_orm::DbErr> {
    // Try find by google_sub
    if let Some(existing) = app_traders::Entity::find()
        .filter(app_traders::Column::GoogleSub.eq(&payload.sub))
        .one(db)
        .await?
    {
        return Ok(existing);
    }

    // First-time sign-in — create new trader row
    let new_trader = app_traders::ActiveModel {
        google_sub: Set(payload.sub.clone()),
        email: Set(payload.email.clone()),
        name: Set(payload.name.clone()),
        ..Default::default()
    };

    let inserted = new_trader.insert(db).await?;
    Ok(inserted)
}
