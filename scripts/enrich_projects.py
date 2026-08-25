import asyncio
from app.db import SessionLocal, engine
from app.github_ingest import enrich_project_languages


async def main():
    async with SessionLocal() as db:
        print(await enrich_project_languages(db, batch_size=600))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
