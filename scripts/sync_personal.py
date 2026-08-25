import asyncio
from app.db import Base, engine
from app.github_ingest import sync_personal_discovery
import app.models


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(await sync_personal_discovery())
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
