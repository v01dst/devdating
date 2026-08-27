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
    assert matches[0]["project"]["name"] == "alpha", "MatchRead should embed the project"
    recommendation = client.get(f"/api/v1/matches/{matches[0]['id']}/issue-recommendation").json()
    assert recommendation["status"] in {"SUGGESTED", "PENDING"}


def test_dashboard_returns_stats_and_paths(client):
    dashboard = client.get("/api/v1/me/dashboard").json()
    assert {"swipes", "likes", "passes", "matches"} <= set(dashboard["stats"])
    assert dashboard["readiness"]["advice"]
    assert any(p["id"] == "first-pr" for p in dashboard["paths"]["paths"])


def test_match_conversation_message_flow(client):
    cards = client.get("/api/v1/discovery/cards").json()
    project_id = next(c["project"]["id"] for c in cards if c["project"]["name"] == "alpha")
    client.post("/api/v1/swipes", json={"project_id": project_id, "direction": "LIKE"})
    match = client.get("/api/v1/matches").json()[0]
    assert match["conversation_id"], "auto-match should create a conversation"
    conversation_id = match["conversation_id"]

    sent = client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json={"body": "I can take this issue"},
    )
    assert sent.status_code == 201

    listed = client.get(
        f"/api/v1/conversations/{conversation_id}/messages?order=asc"
    ).json()
    assert [m["body"] for m in listed] == ["I can take this issue"]

    foreign = client.get("/api/v1/conversations/00000000-0000-0000-0000-000000000000/messages")
    assert foreign.status_code == 404


def test_claim_and_two_way_match_flow(client):
    # A second user (maintainer) claims the project.
    import asyncio

    from app.db import SessionLocal

    async def _make_maintainer():
        from app.models import User

        async with SessionLocal() as db:
            db.add(User(github_id=2002, github_login="maintainer", tech_stack=["python"]))
            await db.commit()

    asyncio.run(_make_maintainer())

    cards = client.get("/api/v1/discovery/cards").json()
    project_id = next(c["project"]["id"] for c in cards if c["project"]["name"] == "alpha")

    # Demo-dev cannot claim while unauthenticated-as-maintainer; but local mode
    # resolves every request to the first user, so claim via the maintainer id is
    # exercised through the endpoint directly.
    claim = client.post(f"/api/v1/projects/{project_id}/claim")
    assert claim.status_code == 201

    maintained = client.get("/api/v1/me/maintained-projects").json()
    assert maintained and maintained[0]["name"] == "alpha"

    # New swipe against the now-maintained project should go PENDING, not MATCHED.
    swipe = client.post("/api/v1/swipes", json={"project_id": project_id, "direction": "LIKE"})
    assert swipe.status_code == 201

    incoming = client.get("/api/v1/me/incoming-matches").json()
    assert incoming and incoming[0]["match_id"]

    respond = client.post(
        f"/api/v1/matches/{incoming[0]['match_id']}/respond", json={"accept": True}
    )
    assert respond.status_code == 200
    assert respond.json()["status"] == "MATCHED"


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
