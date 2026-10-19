import asyncio

from app.db import SessionLocal, engine
from app.github_ingest import (
    DEFAULT_EXPANDED_LANGUAGES,
    bulk_index_issues,
    enrich_project_languages,
    profile_from_github,
)


async def main(target: int):
    # Schema is managed by Alembic (bin/devdating runs `alembic upgrade head`
    # before every sync command) — never create tables here.
    async with SessionLocal() as db:
        profile = await profile_from_github(db)
        languages = list(dict.fromkeys(profile["tech_stack"] + DEFAULT_EXPANDED_LANGUAGES))
        print({"profile": profile, "sync_languages": languages})
        print(await enrich_project_languages(db))
        result = await bulk_index_issues(db, target_issues=target, languages=languages)
        print(result, await enrich_project_languages(db))
    await engine.dispose()


if __name__ == "__main__":
    import sys

    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 500))
