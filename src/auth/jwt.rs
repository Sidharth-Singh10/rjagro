use serde::{Deserialize, Serialize};
use thiserror::Error;
use entity::sea_orm_active_enums::UserRole;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub role: UserRole,
    pub exp: usize,
    pub iat: Option<usize>,
}

/// Claims for the trader mobile app — separate from the admin/supervisor user JWT.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TraderClaims {
    /// trader `id` from `app_traders` table
    pub sub: i32,
    /// always "trader"
    pub role: String,
    pub name: String,
    pub email: String,
    pub picture: Option<String>,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Error)]
pub enum JwtError {
    #[error("JWT decoding/validation error: {0}")]
    Decode(jsonwebtoken::errors::Error),
}

/// Verify and decode a JWT. Returns `Claims` on success.
pub fn verify_jwt(token: &str, secret: &str) -> Result<Claims, JwtError> {
    use jsonwebtoken::{decode, DecodingKey, Validation};

    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(JwtError::Decode)?;
    Ok(token_data.claims)
}

/// Encode a JWT for an app_trader. Returns the signed token string.
pub fn encode_trader_jwt(
    trader_id: i32,
    name: &str,
    email: &str,
    picture: Option<String>,
    secret: &str,
) -> Result<String, jsonwebtoken::errors::Error> {
    use jsonwebtoken::{encode, EncodingKey, Header};

    let now = chrono::Utc::now();
    let claims = TraderClaims {
        sub: trader_id,
        role: "trader".to_string(),
        name: name.to_string(),
        email: email.to_string(),
        picture,
        iat: now.timestamp() as usize,
        exp: (now + chrono::Duration::days(30)).timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}
