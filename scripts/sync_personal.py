import asyncio

from app.db import engine
from app.github_ingest import sync_personal_discovery


async def main():
    # Schema is managed by Alembic; `bin/devdating` applies migrations before this runs.
    print(await sync_personal_discovery())
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
