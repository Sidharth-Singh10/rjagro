//! Login & registration handlers for app_traders (phone + password auth)

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use entity::app_traders;
use entity::sea_orm_active_enums::UserRole;
use jsonwebtoken::{encode, EncodingKey, Header};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};

// ─── JWT Claims for traders ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct TraderClaims {
    /// trader `id` from `app_traders` table (as String for JWT standard compatibility)
    pub sub: String,
    /// UserRole enum (Trader)
    pub role: UserRole,
    pub name: String,
    pub email: String,
    pub exp: usize,
    pub iat: usize,
}

// ─── Request / Response types ────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct TraderLoginRequest {
    pub phone: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct TraderRegisterRequest {
    pub phone: String,
    pub password: String,
    pub name: String,
    pub email: String,
}

#[derive(Serialize)]
pub struct TraderAuthResponse {
    pub trader: TraderPublic,
    pub token: String,
}

/// Public-facing trader info (never expose password_hash)
#[derive(Serialize)]
pub struct TraderPublic {
    pub id: i32,
    pub email: String,
    pub name: String,
    pub phone: String,
    pub credit_limit: Option<sea_orm::prelude::Decimal>,
    pub credit_terms_days: Option<i32>,
}

impl From<app_traders::Model> for TraderPublic {
    fn from(m: app_traders::Model) -> Self {
        Self {
            id: m.id,
            email: m.email,
            name: m.name,
            phone: m.phone,
            credit_limit: m.credit_limit,
            credit_terms_days: m.credit_terms_days,
        }
    }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// POST /trader/login  { phone, password }
pub async fn trader_login_handler(
    State(db): State<DatabaseConnection>,
    Json(body): Json<TraderLoginRequest>,
) -> impl IntoResponse {
    // Find trader by phone
    let trader = match app_traders::Entity::find()
        .filter(app_traders::Column::Phone.eq(&body.phone))
        .one(&db)
        .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "Trader not found" })),
            ))
        }
        Err(e) => {
            tracing::error!("DB error finding trader: {e}");
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            ));
        }
    };

    // Verify password
    match verify(&body.password, &trader.password_hash) {
        Ok(true) => {}
        Ok(false) => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "Invalid password" })),
            ))
        }
        Err(e) => {
            tracing::error!("bcrypt verify error: {e}");
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            ));
        }
    }

    // Issue JWT
    let token = issue_trader_jwt(&trader)?;

    Ok(Json(TraderAuthResponse {
        trader: trader.into(),
        token,
    }))
}

/// POST /trader/register  { phone, password, name, email }
pub async fn trader_register_handler(
    State(db): State<DatabaseConnection>,
    Json(body): Json<TraderRegisterRequest>,
) -> impl IntoResponse {
    // Check if phone already taken
    let existing = app_traders::Entity::find()
        .filter(app_traders::Column::Phone.eq(&body.phone))
        .one(&db)
        .await;

    match existing {
        Ok(Some(_)) => {
            return Err((
                StatusCode::CONFLICT,
                Json(serde_json::json!({ "error": "Phone number already registered" })),
            ))
        }
        Err(e) => {
            tracing::error!("DB error checking existing trader: {e}");
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            ));
        }
        Ok(None) => {} // good to go
    }

    // Hash password
    let password_hash = match hash(&body.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("bcrypt hash error: {e}");
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Internal server error" })),
            ));
        }
    };

    // Insert new trader
    let new_trader = app_traders::ActiveModel {
        phone: Set(body.phone),
        password_hash: Set(password_hash),
        name: Set(body.name),
        email: Set(body.email),
        ..Default::default()
    };

    let trader = match new_trader.insert(&db).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("DB error inserting trader: {e}");
            let msg = if e.to_string().contains("unique") {
                "Email or phone already registered"
            } else {
                "Internal server error"
            };
            return Err((
                StatusCode::CONFLICT,
                Json(serde_json::json!({ "error": msg })),
            ));
        }
    };

    // Issue JWT
    let token = issue_trader_jwt(&trader)?;

    Ok(Json(TraderAuthResponse {
        trader: trader.into(),
        token,
    }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn issue_trader_jwt(
    trader: &app_traders::Model,
) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
    let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "JWT_SECRET not configured" })),
        )
    })?;

    let now = chrono::Utc::now();
    let claims = TraderClaims {
        sub: trader.id.to_string(),
        role: UserRole::Trader,
        name: trader.name.clone(),
        email: trader.email.clone(),
        iat: now.timestamp() as usize,
        exp: (now + chrono::Duration::days(30)).timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| {
        tracing::error!("JWT encode error: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Failed to generate token" })),
        )
    })
}
