import os
import tempfile

_TEST_DB_DIR = tempfile.mkdtemp(prefix="devdating-test-")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB_DIR}/test.db"
os.environ.setdefault("ENVIRONMENT", "local")
os.environ.pop("GITHUB_CLIENT_ID", None)
os.environ.pop("GITHUB_CLIENT_SECRET", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import get_settings  # noqa: E402


@pytest.fixture()
def client():
    import asyncio

    import app.models  # noqa: F401
    from app.db import Base, SessionLocal, engine
    from app.main import app

    async def _create_all():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_create_all())

    async def _seed():
        from sqlalchemy import select

        from app.models import Project, User

        async with SessionLocal() as db:
            if await db.scalar(select(User).limit(1)) is None:
                db.add(User(
                    github_id=1001,
                    github_login="demo-dev",
                    name="Demo Developer",
                    tech_stack=["python", "typescript"],
                    experience_level="INTERMEDIATE",
                ))
            if await db.scalar(select(Project).limit(1)) is None:
                db.add(Project(
                    github_repo_id=42,
                    repo_url="https://github.com/example/alpha",
                    owner_login="example",
                    name="alpha",
                    description="Demo project for tests",
                    languages=["Python"],
                    stars=1000,
                    forks=50,
                    issue_count=10,
                    contributor_count=2,
                    activity_score=80,
                    difficulty_level=2,
                ))
            await db.commit()

    asyncio.run(_seed())
    yield TestClient(app)


@pytest.fixture()
def reset_settings():
    yield
    get_settings.cache_clear()
