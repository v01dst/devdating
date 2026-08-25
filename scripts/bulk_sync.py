import asyncio
from app.db import Base, SessionLocal, engine
from app.github_ingest import profile_from_github, bulk_index_issues
import app.models


async def main(target: int):
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        profile = await profile_from_github(db)
        print({"profile": profile})
        result = await bulk_index_issues(db, target_issues=target, languages=profile["tech_stack"])
        print(result)
    await engine.dispose()


if __name__ == "__main__":
    import sys
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 500))
