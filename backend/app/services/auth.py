"""
Authentication service — JWT token management, password hashing, Google OAuth validation.
Provides stateless auth for the FastAPI backend.
"""

import jwt
import bcrypt
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str, name: str = "") -> str:
    """
    Create a JWT token for a user.

    Args:
        user_id: Unique user ID.
        email: User's email.
        name: User's display name.

    Returns:
        Signed JWT string.
    """
    settings = get_settings()
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.auth_token_expiry_hours),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def validate_token(token: str) -> Optional[dict]:
    """
    Validate a JWT token and return the payload.

    Args:
        token: JWT string from Authorization header.

    Returns:
        Decoded payload dict, or None if invalid/expired.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", e)
        return None


async def verify_google_token(credential: str) -> Optional[dict]:
    """
    Verify a Google OAuth ID token and return user info.

    Uses Google's tokeninfo endpoint to validate the credential.

    Args:
        credential: Google ID token string from frontend.

    Returns:
        Dict with email, name, google_id, picture — or None on failure.
    """
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            )
            if response.status_code != 200:
                logger.warning("Google token verification failed: %s", response.status_code)
                return None

            data = response.json()

            # Verify the audience matches our client ID
            if settings.google_client_id and data.get("aud") != settings.google_client_id:
                logger.warning("Google token audience mismatch")
                return None

            return {
                "email": data.get("email", ""),
                "name": data.get("name", ""),
                "google_id": data.get("sub", ""),
                "picture": data.get("picture", ""),
            }
    except Exception as e:
        logger.error("Google token verification error: %s", e)
        return None
