from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.db import engine
from app.routes import router


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="DevDating API",
    version="0.1.0",
    description="Matches open-source contributors with suitable projects.",
    lifespan=lifespan,
)


@app.get("/healthz", tags=["operations"])
async def healthz() -> dict[str, str]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        return {"status": "degraded"}


@app.get("/readyz", tags=["operations"])
async def readyz() -> dict[str, str]:
    return {"status": "not-configured-for-production"}


app.include_router(router)
