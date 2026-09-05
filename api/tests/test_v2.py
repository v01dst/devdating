# api/tests/test_v2.py
def test_v2_models_importable():
    from app.models import Contribution, Notification
    assert Notification.__tablename__ == "notifications"
    assert Contribution.__tablename__ == "contributions"


def test_status_never_empty(client):
    s = client.get("/api/v1/status").json()
    assert {"project_count", "issue_count", "needs_onboarding"} <= set(s)
    assert s["project_count"] >= 1

def test_notifications_crud(client):
    n = client.get("/api/v1/notifications").json()
    assert isinstance(n, list)
    # swipe LIKE creates a match + notification
    cards = client.get("/api/v1/discovery/cards").json()
    pid = next(c["project"]["id"] for c in cards if c["project"]["name"] == "alpha")
    client.post("/api/v1/swipes", json={"project_id": pid, "direction": "LIKE"})
    after = client.get("/api/v1/notifications").json()
    assert len(after) >= len(n) + 1
    nid = after[0]["id"]
    r = client.patch(f"/api/v1/notifications/{nid}/read")
    assert r.status_code == 200
    assert r.json()["read"] is True

def test_contributions_claim_flow(client):
    _cards = client.get("/api/v1/discovery/cards").json()
    # alpha project has issues via seed? use repo fallback
    c = client.post("/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 1})
    assert c.status_code == 201
    cid = c.json()["id"]
    u = client.patch(f"/api/v1/contributions/{cid}", json={"state": "PR_OPEN", "pr_url": "https://github.com/example/alpha/pull/1"})
    assert u.json()["state"] == "PR_OPEN"
    lst = client.get("/api/v1/contributions").json()
    assert any(x["id"] == cid for x in lst)
