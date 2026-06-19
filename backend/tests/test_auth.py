"""
Unit tests for authentication service functions.
No database or HTTP calls — all functions under test are pure/stateless.
"""

import time
import pytest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone

import jwt
from pydantic import ValidationError

from app.services.auth import hash_password, verify_password, create_token, validate_token
from app.models.schemas import RegisterRequest


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def test_password_hash_and_verify():
    """Hashing a password then verifying the same password returns True."""
    password = "SecurePass1"
    hashed = hash_password(password)

    # The hash should not be the plain text
    assert hashed != password
    # bcrypt output starts with $2b$ or $2a$
    assert hashed.startswith("$2")
    # Verification should succeed
    assert verify_password(password, hashed) is True


def test_wrong_password_fails():
    """Verifying with a wrong password returns False."""
    hashed = hash_password("Password1")
    assert verify_password("wrongpassword", hashed) is False


def test_hash_is_unique_per_call():
    """Two hashes of the same password should differ (bcrypt salting)."""
    h1 = hash_password("Password1")
    h2 = hash_password("Password1")
    assert h1 != h2
    # But both should verify correctly
    assert verify_password("Password1", h1) is True
    assert verify_password("Password1", h2) is True


# ---------------------------------------------------------------------------
# JWT token creation and validation
# ---------------------------------------------------------------------------

def test_create_and_validate_token():
    """Creating a token then validating it returns the correct payload fields."""
    token = create_token(user_id="user-123", email="alice@example.com", name="Alice")
    assert isinstance(token, str)
    assert len(token) > 20

    payload = validate_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["email"] == "alice@example.com"
    assert payload["name"] == "Alice"


def test_create_token_without_name():
    """Token created with empty name validates and preserves the empty string."""
    token = create_token(user_id="user-456", email="bob@example.com", name="")
    payload = validate_token(token)
    assert payload is not None
    assert payload["name"] == ""


def test_invalid_token_returns_none():
    """Passing a garbage string to validate_token returns None."""
    assert validate_token("not.a.real.jwt") is None
    assert validate_token("") is None
    assert validate_token("aaaaa.bbbbb.ccccc") is None


def test_expired_token_returns_none():
    """A token whose exp is in the past is rejected."""
    from app.config import get_settings
    settings = get_settings()

    # Manually craft an already-expired token
    expired_payload = {
        "sub": "user-789",
        "email": "expired@example.com",
        "name": "Ghost",
        "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),  # expired 1h ago
    }
    expired_token = jwt.encode(expired_payload, settings.auth_secret, algorithm="HS256")

    result = validate_token(expired_token)
    assert result is None


def test_token_wrong_secret_returns_none():
    """A token signed with a different secret is rejected."""
    payload = {
        "sub": "user-999",
        "email": "attacker@example.com",
        "name": "Attacker",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    bad_token = jwt.encode(payload, "wrong-secret-key", algorithm="HS256")
    assert validate_token(bad_token) is None


# ---------------------------------------------------------------------------
# RegisterRequest password validation (Pydantic)
# ---------------------------------------------------------------------------

def test_register_request_valid_password():
    """A strong password passes RegisterRequest validation."""
    req = RegisterRequest(email="test@example.com", password="StrongPass1", name="Test")
    assert req.password == "StrongPass1"


def test_register_request_password_too_short():
    """Passwords under 8 characters are rejected."""
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(email="test@example.com", password="Sh0rt", name="Test")
    errors = exc_info.value.errors()
    assert any("8" in str(e) or "characters" in str(e).lower() for e in errors)


def test_register_request_password_no_uppercase():
    """Passwords without an uppercase letter are rejected."""
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(email="test@example.com", password="nouppercase1", name="Test")
    errors = exc_info.value.errors()
    assert any("uppercase" in str(e).lower() for e in errors)


def test_register_request_password_no_digit():
    """Passwords without a digit are rejected."""
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(email="test@example.com", password="NoDigitHere", name="Test")
    errors = exc_info.value.errors()
    assert any("number" in str(e).lower() or "digit" in str(e).lower() for e in errors)


def test_register_request_default_name():
    """Name defaults to empty string when omitted."""
    req = RegisterRequest(email="test@example.com", password="ValidPass1")
    assert req.name == ""
