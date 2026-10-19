import asyncio
import uuid

import pytest

from app.auth import create_session_token, read_socket_token
from app.contribution_sync import normalize_pr, parse_issue_refs, select_best_pr
from app.models import ContributionState

# --- socket tokens -----------------------------------------------------------


def test_socket_token_endpoint_returns_short_lived_token(client):
    body = client.get("/api/v1/socket-token").json()
    assert body["token"]
    assert body["expires_in"] > 0
    user_id = read_socket_token(body["token"])
    assert isinstance(user_id, uuid.UUID)


def test_socket_token_rejects_session_tokens():
    session_token = create_session_token(uuid.uuid4())
    with pytest.raises(ValueError):
        read_socket_token(session_token)


# --- notifications -----------------------------------------------------------


def test_unread_count_tracks_notifications(client):
    assert client.get("/api/v1/notifications/unread-count").json()["count"] == 0
    claimed = client.post(
        "/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 7}
    )
    assert claimed.status_code == 201
    assert client.get("/api/v1/notifications/unread-count").json()["count"] == 1
    client.post("/api/v1/notifications/read-all")
    assert client.get("/api/v1/notifications/unread-count").json()["count"] == 0


# --- contribution lifecycle --------------------------------------------------


def test_contribution_claim_validates_repo_format(client):
    bad = client.post(
        "/api/v1/contributions/claim", json={"repo": "not-a-repo", "issue_number": 1}
    )
    assert bad.status_code == 422
    good = client.post(
        "/api/v1/contributions/claim", json={"repo": "some-org/my.repo-name", "issue_number": 3}
    )
    assert good.status_code == 201
    assert good.json()["state"] == "CLAIMED"


def test_claim_is_idempotent_until_merged(client):
    payload = {"repo": "example/alpha", "issue_number": 5}
    first = client.post("/api/v1/contributions/claim", json=payload)
    second = client.post("/api/v1/contributions/claim", json=payload)
    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_contribution_update_and_listing_include_sync_fields(client):
    cid = client.post(
        "/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 5}
    ).json()["id"]
    patched = client.patch(
        f"/api/v1/contributions/{cid}",
        json={"state": "PR_OPEN", "pr_url": "https://github.com/example/alpha/pull/30"},
    )
    assert patched.status_code == 200
    assert patched.json()["state"] == "PR_OPEN"
    listed = client.get("/api/v1/contributions").json()
    assert listed[0]["pr_url"] == "https://github.com/example/alpha/pull/30"
    assert listed[0]["last_synced_at"] is None
    assert listed[0]["updated_at"] is not None


# --- contribution sync -------------------------------------------------------


def test_parse_issue_refs_ignores_cross_repo_refs():
    refs = parse_issue_refs("Fixes #12 and owner/repo#99", None, "closes #13")
    assert refs == {12, 13}


def test_normalize_pr_marks_closed_unmerged_as_none():
    pr = normalize_pr(
        {"number": 1, "state": "closed", "pull_request": {"merged_at": None}}
    )
    assert pr is not None and pr["state"] is None


def test_select_best_pr_prefers_merged_over_open():
    merged = normalize_pr(
        {
            "number": 50,
            "title": "Fix the thing",
            "body": "Closes #7",
            "state": "closed",
            "html_url": "https://github.com/x/y/pull/50",
            "updated_at": "2026-10-01T00:00:00Z",
            "pull_request": {"merged_at": "2026-10-02T00:00:00Z"},
        }
    )
    still_open = normalize_pr(
        {
            "number": 51,
            "title": "Another attempt",
            "body": "see #7",
            "state": "open",
            "html_url": "https://github.com/x/y/pull/51",
            "updated_at": "2026-10-05T00:00:00Z",
            "pull_request": {"merged_at": None},
        }
    )
    best = select_best_pr([still_open, merged], 7)
    assert best is not None and best["state"] == ContributionState.MERGED
    assert select_best_pr([still_open, merged], 999) is None


def test_sync_advances_states_from_github_activity(client, monkeypatch):
    import app.contribution_sync as contribution_sync

    client.post("/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 12})
    client.post("/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 13})

    async def fake_fetch(repo: str, login: str) -> list[dict]:
        assert repo == "example/alpha" and login
        return [
            {
                "number": 50,
                "title": "Fix the thing",
                "body": "Closes #12",
                "state": "closed",
                "html_url": "https://github.com/example/alpha/pull/50",
                "updated_at": "2026-10-01T00:00:00Z",
                "pull_request": {"merged_at": "2026-10-02T00:00:00Z"},
            },
            {
                "number": 51,
                "title": "More work",
                "body": "related to #13",
                "state": "open",
                "html_url": "https://github.com/example/alpha/pull/51",
                "updated_at": "2026-10-03T00:00:00Z",
                "pull_request": {"merged_at": None},
            },
        ]

    monkeypatch.setattr(contribution_sync, "fetch_contributor_prs", fake_fetch)
    result = client.post("/api/v1/contributions/sync", json={}).json()
    assert result["repos_checked"] == 1
    assert result["contributions_checked"] == 2
    assert len(result["updated"]) == 2

    states = {c["issue_number"]: c for c in client.get("/api/v1/contributions").json()}
    assert states[12]["state"] == "MERGED"
    assert states[12]["pr_url"].endswith("/pull/50")
    assert states[13]["state"] == "PR_OPEN"
    assert all(c["last_synced_at"] for c in states.values())
    # Two claims + two advanced transitions all produced notifications.
    assert client.get("/api/v1/notifications/unread-count").json()["count"] == 4


def test_sync_respects_recent_check_window_and_force(client, monkeypatch):
    import app.contribution_sync as contribution_sync

    client.post("/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 21})
    calls = {"count": 0}

    async def fake_fetch(repo: str, login: str) -> list[dict]:
        calls["count"] += 1
        return []

    monkeypatch.setattr(contribution_sync, "fetch_contributor_prs", fake_fetch)
    first = client.post("/api/v1/contributions/sync", json={}).json()
    second = client.post("/api/v1/contributions/sync", json={}).json()
    forced = client.post("/api/v1/contributions/sync", json={"force": True}).json()
    assert first["repos_checked"] == 1
    assert second["repos_checked"] == 0 and second["skipped_recent"] == 1
    assert forced["repos_checked"] == 1
    assert calls["count"] == 2


def test_sync_reports_github_errors_per_repo(client, monkeypatch):
    import app.contribution_sync as contribution_sync

    client.post("/api/v1/contributions/claim", json={"repo": "example/alpha", "issue_number": 33})

    async def failing_fetch(repo: str, login: str) -> list[dict]:
        raise RuntimeError("GitHub responded 403")

    monkeypatch.setattr(contribution_sync, "fetch_contributor_prs", failing_fetch)
    result = client.post("/api/v1/contributions/sync", json={}).json()
    assert result["repos_checked"] == 0
    assert result["errors"] and result["errors"][0]["repo"] == "example/alpha"


# --- payload additions for tracking CTAs -------------------------------------


def test_recommended_issues_include_repo_and_issue_number(client):
    async def _seed():
        from sqlalchemy import select

        from app.db import SessionLocal
        from app.models import Issue, Project

        async with SessionLocal() as db:
            project = (await db.execute(select(Project).where(Project.name == "alpha"))).scalar_one()
            project.description = "A generously long description for filtering purposes here."
            db.add(
                Issue(
                    project_id=project.id,
                    issue_number=9,
                    title="Trackable issue",
                    url="https://example.com/9",
                    labels=["help wanted"],
                    difficulty_score=20,
                )
            )
            await db.commit()

    asyncio.run(_seed())
    issues = client.get("/api/v1/me/recommended-issues?limit=10").json()
    trackable = next(i for i in issues if i["title"] == "Trackable issue")
    assert trackable["repo"] == "example/alpha"
    assert trackable["issue_number"] == 9


def test_match_recommendation_includes_issue_number(client):
    async def _seed():
        from sqlalchemy import select

        from app.db import SessionLocal
        from app.models import Issue, Project

        async with SessionLocal() as db:
            project = (await db.execute(select(Project).where(Project.name == "alpha"))).scalar_one()
            db.add(
                Issue(
                    project_id=project.id,
                    issue_number=9,
                    title="Starter fix",
                    url="https://example.com/issues/9",
                    labels=["good first issue"],
                    difficulty_score=15,
                    difficulty_confidence=0.8,
                    state="OPEN",
                )
            )
            await db.commit()

    asyncio.run(_seed())
    swipe = client.post(
        "/api/v1/swipes",
        json={
            "project_id": client.get("/api/v1/discovery/cards?limit=1").json()[0]["project"]["id"],
            "direction": "LIKE",
        },
    )
    body = swipe.json()
    assert body["match_created"] is True, body
    recommendation = client.get(
        f"/api/v1/matches/{body['match_id']}/issue-recommendation"
    ).json()
    assert recommendation["status"] != "PENDING"
    assert recommendation["issue_number"] == 9
    assert recommendation["repo"] == "example/alpha"
