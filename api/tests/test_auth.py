import uuid

import pytest
from itsdangerous import BadSignature, SignatureExpired

import app.auth as auth
from app.auth import (
    create_session_token,
    oauth_configured,
    read_session_user_id,
)


def test_session_roundtrip():
    user_id = uuid.uuid4()
    token = create_session_token(user_id)
    assert read_session_user_id(token) == user_id


def test_tampered_token_rejected():
    token = create_session_token(uuid.uuid4())
    with pytest.raises(BadSignature):
        read_session_user_id(token + "x")


def test_expired_token_rejected(monkeypatch):
    token = create_session_token(uuid.uuid4())
    monkeypatch.setattr(auth, "SESSION_TTL_SECONDS", -1)
    with pytest.raises(SignatureExpired):
        read_session_user_id(token)


def test_oauth_configured_reflects_settings(monkeypatch):
    from app.config import get_settings

    monkeypatch.setenv("GITHUB_CLIENT_ID", "id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "secret")
    get_settings.cache_clear()
    try:
        assert oauth_configured() is True
    finally:
        monkeypatch.delenv("GITHUB_CLIENT_ID")
        monkeypatch.delenv("GITHUB_CLIENT_SECRET")
        get_settings.cache_clear()
    assert oauth_configured() is False
