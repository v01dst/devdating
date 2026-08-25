import asyncio
from app.db import SessionLocal, engine
from app.github_ingest import fetch_community_questions


async def main():
    async with SessionLocal() as session:
        print(await fetch_community_questions(session))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
