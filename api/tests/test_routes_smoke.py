from fastapi import status


def test_healthz_ok(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_dev_stub_identity_in_local_mode(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["github_login"] == "demo-dev"


def test_swipe_auto_match_creates_recommendation(client):
    cards = client.get("/api/v1/discovery/cards").json()
    project_id = next(c["project"]["id"] for c in cards if c["project"]["name"] == "alpha")
    swipe = client.post("/api/v1/swipes", json={"project_id": project_id, "direction": "LIKE"})
    assert swipe.status_code == 201
    body = swipe.json()
    assert body["match_created"] is True
    matches = client.get("/api/v1/matches").json()
    assert matches, "expected an auto-match"
    recommendation = client.get(f"/api/v1/matches/{matches[0]['id']}/issue-recommendation").json()
    assert recommendation["status"] in {"SUGGESTED", "PENDING"}


def test_oauth_enforcement_returns_401_without_session(client, monkeypatch, reset_settings):
    from app.config import get_settings

    monkeypatch.setenv("GITHUB_CLIENT_ID", "id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "secret")
    get_settings.cache_clear()
    try:
        response = client.get("/api/v1/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Authentication required" in response.json()["detail"]
    finally:
        monkeypatch.delenv("GITHUB_CLIENT_ID")
        monkeypatch.delenv("GITHUB_CLIENT_SECRET")


def test_login_redirect_sets_state_cookie(client, monkeypatch, reset_settings):
    from app.config import get_settings

    monkeypatch.setenv("GITHUB_CLIENT_ID", "id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "secret")
    get_settings.cache_clear()
    try:
        response = client.get("/api/v1/auth/github/login", follow_redirects=False)
        assert response.status_code == 303
        assert "github.com/login/oauth/authorize" in response.headers["location"]
        assert "devdating_oauth_state" in response.cookies
    finally:
        monkeypatch.delenv("GITHUB_CLIENT_ID")
        monkeypatch.delenv("GITHUB_CLIENT_SECRET")


def test_callback_rejects_state_mismatch(client, monkeypatch, reset_settings):
    from app.config import get_settings

    monkeypatch.setenv("GITHUB_CLIENT_ID", "id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "secret")
    get_settings.cache_clear()
    try:
        client.cookies.set("devdating_oauth_state", "expected")
        response = client.get(
            "/api/v1/auth/github/callback?code=abc&state=wrong", follow_redirects=False
        )
        assert response.status_code == 303
        assert "auth_error=state_mismatch" in response.headers["location"]
    finally:
        monkeypatch.delenv("GITHUB_CLIENT_ID")
        monkeypatch.delenv("GITHUB_CLIENT_SECRET")
