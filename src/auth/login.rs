use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use bcrypt::verify;
use cookie::{Cookie, SameSite};
use entity::users;
use jsonwebtoken::encode;
use jsonwebtoken::EncodingKey;
use jsonwebtoken::Header;
use reqwest::header::AUTHORIZATION;
use sea_orm::ColumnTrait;
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use serde::{Deserialize, Serialize};

use crate::auth::jwt::Claims;

pub async fn login_handler(
    State(db): State<DatabaseConnection>,
    Json(login_info): Json<LoginInfo>,
) -> impl IntoResponse {
    let email = &login_info.email;
    let password = &login_info.password;

    // Find user by email
    let user_result = users::Entity::find()
        .filter(users::Column::Email.eq(email))
        .one(&db)
        .await;

    // Handle database errors
    let user = match user_result {
        Ok(maybe_user) => {
            if let Some(user) = maybe_user {
                user
            } else {
                return Err(StatusCode::NOT_FOUND);
            }
        }
        Err(e) => {
            eprintln!("Database error when finding user: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    if !verify_password(password, &user.password) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let claims = Claims {
        sub: user.user_id.to_string(),
        role: user.role.clone(),
        iat: None,
        exp: (chrono::Utc::now() + chrono::Duration::days(1)).timestamp() as usize,
    };

    let jwt_secret = match std::env::var("JWT_SECRET") {
        Ok(s) => s,
        Err(_) => {
            eprintln!("JWT_SECRET environment variable not set");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let token = match encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    ) {
        Ok(tok) => tok,
        Err(e) => {
            eprintln!("Error generating token: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Create response with token in cookie and header
    let bearer_token = format!("Bearer {}", token);
    let mut cookie = Cookie::new("token", bearer_token.clone());
    cookie.set_http_only(false);
    cookie.set_path("/");
    cookie.set_secure(true);
    cookie.set_same_site(SameSite::None);
    cookie.set_partitioned(true);
    // For production, also set cookie.set_secure(true) and SameSite

    let mut headers = HeaderMap::new();
    headers.insert("Set-Cookie", cookie.to_string().parse().unwrap());
    // Also add token to Authorization header for API usage
    headers.insert(AUTHORIZATION, bearer_token.parse().unwrap());

    // Create response with user data and details
    let response = LoginResponse { user, token };

    Ok((headers, Json(response)).into_response())
}

fn verify_password(password: &str, hashed_password: &str) -> bool {
    let valid = verify(password, hashed_password);

    match valid {
        Ok(valid) => valid,
        Err(e) => {
            eprintln!("Error verifying password: {}", e);
            false
        }
    }
}

#[derive(Deserialize)]
pub struct LoginInfo {
    pub email: String,
    pub password: String,
}
#[derive(Serialize)]
pub struct LoginResponse {
    pub user: users::Model,
    pub token: String,
}
