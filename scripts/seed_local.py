import asyncio
import zlib
from sqlalchemy import select
from app.db import Base
from app.db import SessionLocal as async_session_factory, engine
from app.models import Project, SwipeDirection, User

PROJECTS = [
 ("https://github.com/example/fastapi-realworld","fastapi-realworld","FastAPI RealWorld",["Python","Docker"],["backend","api","sqlalchemy"],4820,120,18,88.0,2.0),
 ("https://github.com/example/tailwind-dashboard","tailwind-dashboard","Tailwind Dashboard",["TypeScript","JavaScript"],["frontend","design-system","dashboard"],7310,240,42,94.0,2.5),
 ("https://github.com/example/ml-toolkit","ml-toolkit","Open ML Toolkit",["Python","Jupyter Notebook"],["machine-learning","scikit-learn","data"],12480,380,64,82.0,3.5),
 ("https://github.com/example/rust-cli-kit","rust-cli-kit","Rust CLI Kit",["Rust"],["cli","developer-tools","performance"],3110,95,29,76.0,3.0),
 ("https://github.com/example/accessibility-ui","accessibility-ui","Accessible UI",["TypeScript","CSS"],["accessibility","react","components"],1890,58,31,69.0,1.5),
]

async def reset_and_seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all, tables=[Project.__table__])
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_factory() as db:
        user = (await db.execute(select(User))).scalars().first()
        if not user:
            user = User(github_id=1001, github_login="demo-dev", name="Demo Developer", email="demo@example.com",
                        tech_stack=["python","typescript"], domains=["backend","frontend"], experience_level="INTERMEDIATE")
            db.add(user)
        for row in PROJECTS:
            repo_url,owner,name,languages,topics,stars,forks,issues,activity,difficulty = row
            if not (await db.execute(select(Project).where(Project.repo_url==repo_url))).scalar_one_or_none():
                db.add(Project(repo_url=repo_url, github_repo_id=zlib.crc32(repo_url.encode()) % 100000000, owner_login=owner,name=name,
                               description=f"A production-inspired {name.lower()} project with approachable contribution paths.",
                               languages=languages,topics=topics,stars=stars,forks=forks,issue_count=issues,
                               contributor_count=max(1, issues//8),activity_score=activity,difficulty_level=difficulty,synced_at=None))
        await db.commit()
    await engine.dispose()
    print("Seeded", len(PROJECTS), "projects and one demo developer.")

if __name__ == "__main__": asyncio.run(reset_and_seed())
