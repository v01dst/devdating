from collections.abc import AsyncGenerator
from pathlib import Path
import os

from sqlalchemy import event

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
database_url = os.environ.get("DATABASE_URL", settings.database_url)
if database_url.startswith("sqlite"):
    sqlite_path = Path(database_url.split("///", 1)[1])
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_async_engine(database_url, connect_args={"timeout": 15})
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
else:
    engine = create_async_engine(database_url, pool_pre_ping=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)
SessionLocal = async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
