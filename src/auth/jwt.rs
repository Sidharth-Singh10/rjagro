use entity::sea_orm_active_enums::UserRole;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub role: UserRole,
    pub exp: usize,
    pub iat: Option<usize>,
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
