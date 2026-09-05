import asyncio
from datetime import UTC, datetime, timedelta


def _db(coro):
    return asyncio.run(coro)


async def _add_project_with_synced(db, name, synced_days_ago,
                                   description="A generously long description for filtering here."):
    import zlib

    from app.models import Project

    repo_url = f"https://github.com/example/{name}"
    db.add(Project(
        github_repo_id=zlib.crc32(repo_url.encode()) % 100000000,
        repo_url=repo_url, owner_login="example", name=name,
        description=description, languages=["Python"],
        stars=10, forks=1, issue_count=5, contributor_count=1,
        activity_score=50, difficulty_level=2,
        synced_at=datetime.now(UTC) - timedelta(days=synced_days_ago),
    ))
    await db.commit()


def test_projects_latest_sort_orders_by_synced_at(client):
    from app.db import SessionLocal

    async def _seed():
        async with SessionLocal() as db:
            await _add_project_with_synced(db, "old-proj", 9)
            await _add_project_with_synced(db, "new-proj", 1)

    _db(_seed())
    names = [p["name"] for p in client.get("/api/v1/projects/public?sort=latest&limit=10").json()]
    assert names.index("new-proj") < names.index("old-proj")


def test_issues_sort_latest_and_easy(client):
    from app.db import SessionLocal

    async def _seed():
        from sqlalchemy import select

        from app.models import Issue, Project

        async with SessionLocal() as db:
            project = (await db.execute(select(Project).where(Project.name == "alpha"))).scalar_one()
            project.description = "A generously long description for filtering purposes here."
            now = datetime.now(UTC)
            db.add(Issue(project_id=project.id, issue_number=1, title="Old hard issue",
                         url="https://example.com/1", labels=["help wanted"],
                         difficulty_score=80, opened_at=now - timedelta(days=9)))
            db.add(Issue(project_id=project.id, issue_number=2, title="New easy issue",
                         url="https://example.com/2", labels=["good first issue"],
                         difficulty_score=10, opened_at=now - timedelta(days=1)))
            await db.commit()

    _db(_seed())
    latest = [i["title"] for i in client.get("/api/v1/me/recommended-issues?sort=latest&limit=10").json()]
    assert latest.index("New easy issue") < latest.index("Old hard issue")
    easy = [i["title"] for i in client.get("/api/v1/me/recommended-issues?sort=easy&limit=10").json()]
    assert easy.index("New easy issue") < easy.index("Old hard issue")


def _alpha_id(client):
    cards = client.get("/api/v1/discovery/cards").json()
    return next(c["project"]["id"] for c in cards if c["project"]["name"] == "alpha")


def test_swipe_response_includes_match_id(client):
    swipe = client.post("/api/v1/swipes", json={"project_id": _alpha_id(client), "direction": "LIKE"}).json()
    assert swipe["match_created"] is True
    assert swipe["match_id"] == client.get("/api/v1/matches").json()[0]["id"]


def test_undo_swipe_keeps_auto_match_and_allows_reswipe(client):
    pid = _alpha_id(client)
    assert client.post("/api/v1/swipes", json={"project_id": pid, "direction": "LIKE"}).status_code == 201
    undone = client.delete("/api/v1/swipes/last").json()
    assert undone == {"undone": True, "project_id": pid, "removed_match": False}
    assert len(client.get("/api/v1/matches").json()) == 1
    assert client.post("/api/v1/swipes", json={"project_id": pid, "direction": "LIKE"}).status_code == 201
    assert client.delete("/api/v1/swipes/last").json()["undone"] is True
    assert client.delete("/api/v1/swipes/last").json() == {"undone": False, "project_id": None, "removed_match": False}


def test_undo_swipe_removes_pending_match(client):
    pid = _alpha_id(client)
    assert client.post(f"/api/v1/projects/{pid}/claim").status_code == 201
    swipe = client.post("/api/v1/swipes", json={"project_id": pid, "direction": "LIKE"}).json()
    assert swipe["match_created"] is True
    assert client.get("/api/v1/me/incoming-matches").json(), "expected a pending incoming match"
    undone = client.delete("/api/v1/swipes/last").json()
    assert undone == {"undone": True, "project_id": pid, "removed_match": True}
    assert client.get("/api/v1/me/incoming-matches").json() == []


def test_index_sync_lifecycle(client, monkeypatch):
    async def fake_bulk(session, **kwargs):
        return {"issues_processed": 7, "projects_created": 2}

    async def fake_enrich(session, **kwargs):
        return {"projects_updated": 1}

    monkeypatch.setattr("app.routes.bulk_index_issues", fake_bulk)
    monkeypatch.setattr("app.routes.enrich_project_languages", fake_enrich)
    created = client.post("/api/v1/admin/sync", json={"target": 50}).json()
    assert created["target"] == 50
    assert created["id"]
    import time

    latest = None
    for _ in range(100):
        latest = client.get("/api/v1/admin/sync/runs/latest").json()
        if latest["state"] in ("DONE", "FAILED"):
            break
        time.sleep(0.1)
    assert latest["state"] == "DONE"
    assert latest["indexed"] == 7
    assert latest["id"] == created["id"]


def test_resolve_label_queries():
    from app.github_ingest import ISSUE_LABEL_QUERIES, resolve_label_queries

    assert resolve_label_queries(None) == ISSUE_LABEL_QUERIES
    assert resolve_label_queries([]) == ISSUE_LABEL_QUERIES
    bug = resolve_label_queries(["bug"])
    assert bug == ['label:bug', 'label:"type: bug"']
    both = resolve_label_queries(["good-first", "bug"])
    assert 'label:"good first issue"' in both and "label:bug" in both
    try:
        resolve_label_queries(["nope"])
    except KeyError:
        pass
    else:
        raise AssertionError("expected KeyError for unknown group")


def test_resolve_difficulty_range():
    from app.github_ingest import difficulty_kept, resolve_difficulty_range

    assert resolve_difficulty_range(None) == (0, 100)
    assert resolve_difficulty_range("beginner") == (0, 35)
    assert resolve_difficulty_range("mid") == (35, 65)
    assert resolve_difficulty_range("hard") == (65, 100)
    assert difficulty_kept(35, 0, 35) is True
    assert difficulty_kept(35.1, 0, 35) is False
    assert difficulty_kept(100, 65, 100) is True


def test_sync_rejects_unknown_label_group(client):
    response = client.post("/api/v1/admin/sync", json={"target": 50, "label_groups": ["nope"]})
    assert response.status_code == 422


def test_sync_stores_filters_and_passes_them_through(client, monkeypatch):
    seen = {}

    async def fake_bulk(session, **kwargs):
        seen.update(kwargs)
        return {"issues_processed": 3, "projects_created": 1}

    async def fake_enrich(session, **kwargs):
        return {"projects_updated": 0}

    monkeypatch.setattr("app.routes.bulk_index_issues", fake_bulk)
    monkeypatch.setattr("app.routes.enrich_project_languages", fake_enrich)
    created = client.post(
        "/api/v1/admin/sync",
        json={"target": 50, "label_groups": ["bug"], "difficulty": "beginner"},
    ).json()
    assert created["label_groups"] == ["bug"]
    assert created["difficulty"] == "beginner"
    assert seen["label_queries"] == ['label:bug', 'label:"type: bug"']
    assert (seen["min_difficulty"], seen["max_difficulty"]) == (0, 35)
