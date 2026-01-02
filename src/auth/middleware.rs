use axum::{
    body::Body, extract::State, http::{Request, StatusCode}, middleware::Next, response::Response
};
use std::collections::HashSet;

use crate::auth::jwt::verify_jwt; // now using your verify_jwt function
use entity::sea_orm_active_enums::UserRole;

pub async fn auth_middleware(
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, &'static str)> {
    // Get `Authorization` header
    let auth_header = req.headers().get(axum::http::header::AUTHORIZATION);
    let auth_header = match auth_header {
        Some(header) => match header.to_str() {
            Ok(header_str) => header_str,
            Err(_) => return Err((StatusCode::FORBIDDEN, "Invalid header format")),
        },
        None => {
            return Err((
                StatusCode::FORBIDDEN,
                "Please add the JWT token to the header",
            ))
        }
    };

    // Extract token from header
    let mut header_parts = auth_header.split_whitespace();
    let (_bearer, token) = (header_parts.next(), header_parts.next());

    let claims = match token {
        Some(token) => {
            println!("Token: {}", token);
            let jwt_secret = std::env::var("JWT_SECRET")
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "JWT_SECRET missing"))?;

            match verify_jwt(token, &jwt_secret) {
                Ok(claims) => claims,
                Err(_) => return Err((StatusCode::UNAUTHORIZED, "Unable to decode token")),
            }
        }
        None => return Err((StatusCode::FORBIDDEN, "Missing token")),
    };

    // Add user info to request extensions
    req.extensions_mut().insert(claims.sub.clone());
    req.extensions_mut().insert(claims.role.clone());

    Ok(next.run(req).await)
}

#[derive(Clone)]
pub struct RequireRoles {
    allowed: HashSet<UserRole>,
}
impl RequireRoles {
    pub fn new(role: &[UserRole]) -> Self {
        Self {
            allowed: role.iter().cloned().collect(),
        }
    }
}
pub async fn require_roles_middleware(
    State(allowed_roles): State<RequireRoles>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, &'static str)> {
    match req.extensions().get::<UserRole>() {
        Some(role) if allowed_roles.allowed.contains(role) => Ok(next.run(req).await),
        _ => Err((StatusCode::FORBIDDEN, "Insufficient permissions")),
    }
}
