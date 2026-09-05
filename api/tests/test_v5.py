def test_project_payloads_include_synced_at(client):
    body = client.get("/api/v1/projects/public?limit=2").json()
    assert body, "expected seeded projects"
    assert "synced_at" in body[0]
    cards = client.get("/api/v1/discovery/cards?limit=2").json()
    assert cards, "expected discovery cards"
    assert "synced_at" in cards[0]["project"]


def test_issue_payloads_include_opened_at(client):
    from app.db import SessionLocal
    from datetime import UTC, datetime, timedelta
    import asyncio

    async def _seed():
        from sqlalchemy import select

        from app.models import Issue, Project

        async with SessionLocal() as db:
            project = (await db.execute(select(Project).where(Project.name == "alpha"))).scalar_one()
            project.description = "A generously long description for filtering purposes here."
            db.add(Issue(project_id=project.id, issue_number=9, title="Dated issue",
                         url="https://example.com/9", labels=["help wanted"],
                         difficulty_score=20, opened_at=datetime.now(UTC) - timedelta(days=2)))
            await db.commit()

    asyncio.run(_seed())
    issues = client.get("/api/v1/me/recommended-issues?limit=10").json()
    dated = next(i for i in issues if i["title"] == "Dated issue")
    assert dated["opened_at"] is not None
