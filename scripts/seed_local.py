"""Seed the local DB with real GitHub projects (metadata snapshot).

The starter set is **real repositories** with real links and real metrics,
fetched from the GitHub API on 2026-10-19 — never placeholder/example URLs.
`bin/devdating seed` / first-run bootstrap lands these so the UI has a solid
base immediately; the Index action (`/sync` runs) then pulls live issues and
more projects straight from GitHub on top.

Notes:
- `contributor_count` uses the same estimate as the real ingest
  (`github_ingest.py`): min(1000, stars // 50).
- `activity_score` is a rough recency estimate from `pushed_at`
  (96 = pushed within the week, 90 = within a month, 80 = within 3 months,
  65 = within a year, 45 = older).
- `difficulty_level` is a rough starter estimate (1.0 = exercises-level,
  3.5 = large project with review process).
- Star/issue counts are a snapshot; a live sync refreshes them.
"""

import asyncio
import zlib
from sqlalchemy import select
from app.db import Base
from app.db import SessionLocal as async_session_factory, engine
from app.models import Project, SwipeDirection, User

# (repo_url, owner, name, description, languages, topics, stars, forks,
#  open_issues, activity_score, difficulty_level) — GitHub snapshot 2026-10-19
PROJECTS = [
    ("https://github.com/fastapi/fastapi", "fastapi", "fastapi",
     "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
     ["Python", "JavaScript", "Shell"], ["api", "async", "asyncio"],
     103243, 10057, 76, 96.0, 2.0),
    ("https://github.com/scikit-learn/scikit-learn", "scikit-learn", "scikit-learn",
     "scikit-learn: machine learning in Python",
     ["Python", "Cython", "C++"], ["data-science", "machine-learning", "python"],
     67843, 27548, 2159, 96.0, 3.5),
    ("https://github.com/pydantic/pydantic", "pydantic", "pydantic",
     "Data validation using Python type hints",
     ["Python", "Rust", "Makefile"], ["json-schema", "parsing", "validation"],
     29094, 3047, 590, 96.0, 2.5),
    ("https://github.com/vitejs/vite", "vitejs", "vite",
     "Next generation frontend tooling. It's fast!",
     ["TypeScript", "JavaScript", "HTML"], ["build-tool", "dev-server", "frontend"],
     83395, 8876, 810, 96.0, 3.0),
    ("https://github.com/withastro/astro", "withastro", "astro",
     "The web framework for content-driven websites.",
     ["TypeScript", "Astro", "JavaScript"], ["astro", "blog", "components"],
     63315, 3860, 128, 96.0, 2.5),
    ("https://github.com/rust-lang/rustlings", "rust-lang", "rustlings",
     ":crab: Small exercises to get you used to reading and writing Rust code!",
     ["Rust", "HTML", "CSS"], ["beginner-friendly", "exercises", "rust"],
     64387, 11258, 38, 90.0, 1.0),
    ("https://github.com/vercel/next.js", "vercel", "next.js",
     "The React Framework",
     ["JavaScript", "TypeScript", "Rust"], ["blog", "browser", "compiler"],
     143086, 35241, 3699, 96.0, 3.5),
]


async def reset_and_seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all, tables=[Project.__table__])
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_factory() as db:
        user = (await db.execute(select(User))).scalars().first()
        if not user:
            user = User(github_id=1001, github_login="demo-dev", name="Demo Developer",
                        email="demo@devdating.local",
                        tech_stack=["python", "typescript", "javascript", "rust"], domains=["backend", "frontend"],
                        experience_level="INTERMEDIATE")
            db.add(user)
        for row in PROJECTS:
            (repo_url, owner, name, description, languages, topics,
             stars, forks, issues, activity, difficulty) = row
            if not (await db.execute(select(Project).where(Project.repo_url == repo_url))).scalar_one_or_none():
                db.add(Project(
                    repo_url=repo_url,
                    github_repo_id=zlib.crc32(repo_url.encode()) % 100000000,
                    owner_login=owner,
                    name=name,
                    description=description,
                    languages=languages,
                    topics=topics,
                    stars=stars,
                    forks=forks,
                    issue_count=issues,
                    contributor_count=max(1, min(1000, stars // 50)),
                    activity_score=activity,
                    difficulty_level=difficulty,
                    synced_at=None,
                ))
        await db.commit()
    await engine.dispose()
    print("Seeded", len(PROJECTS), "real GitHub projects and one demo developer.")


if __name__ == "__main__":
    asyncio.run(reset_and_seed())
