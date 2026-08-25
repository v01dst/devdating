import asyncio
from app.db import Base, SessionLocal, engine
from app.github_ingest import DEFAULT_EXPANDED_LANGUAGES, profile_from_github, bulk_index_issues, enrich_project_languages
import app.models


async def main(target: int):
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        profile = await profile_from_github(db)
        languages = list(dict.fromkeys(profile["tech_stack"] + DEFAULT_EXPANDED_LANGUAGES))
        print({"profile": profile, "sync_languages": languages})
        enriched = await enrich_project_languages(db)
        print(enriched)
        result = await bulk_index_issues(db, target_issues=target, languages=languages)
        enriched = await enrich_project_languages(db)
        print(result, enriched)
    await engine.dispose()


if __name__ == "__main__":
    import sys
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 500))
