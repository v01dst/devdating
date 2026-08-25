from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_github_identity(access_token: str) -> dict:
    async with httpx.AsyncClient(base_url="https://api.github.com") as client:
        response = await client.get(
            "/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
    if response.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid GitHub access token")
    return response.json()


async def get_or_create_user_from_github(access_token: str, db: AsyncSession) -> User:
    identity = await get_github_identity(access_token)
    github_id = int(identity["id"])
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(github_id=github_id, github_login=identity["login"])
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def require_development_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    settings = get_settings()
    if settings.environment != "local":
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Production session auth not implemented yet")
    token = credentials.credentials if credentials else "demo-user"
    return await get_or_create_user_from_github(token, db)
