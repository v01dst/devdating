import secrets
import uuid
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)

SESSION_COOKIE = "devdating_session"
OAUTH_STATE_COOKIE = "devdating_oauth_state"
SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
STATE_TTL_SECONDS = 600

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _signer() -> TimestampSigner:
    secret = get_settings().session_secret or "development-secret"
    return TimestampSigner(secret)


def create_session_token(user_id: uuid.UUID) -> str:
    return _signer().sign(str(user_id)).decode()


def read_session_user_id(token: str) -> uuid.UUID:
    payload = _signer().unsign(token, max_age=SESSION_TTL_SECONDS).decode()
    return uuid.UUID(payload)


def oauth_configured() -> bool:
    settings = get_settings()
    return bool(settings.github_client_id and settings.github_client_secret)


def _cookie_params() -> dict:
    return {
        "httponly": True,
        "samesite": "lax",
        "secure": get_settings().environment != "local",
    }


def _frontend_url(request: Request) -> str:
    return get_settings().web_origin or str(request.base_url).rstrip("/")


async def get_github_identity(access_token: str) -> dict:
    async with httpx.AsyncClient(base_url="https://api.github.com") as client:
        response = await client.get(
            "/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
    if response.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid GitHub access token")
    return response.json()


async def exchange_code_for_token(code: str, redirect_uri: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(base_url="https://github.com") as client:
        response = await client.post(
            "/login/oauth/access_token",
            json={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
    payload = response.json()
    token = payload.get("access_token")
    if response.status_code != 200 or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="GitHub code exchange failed")
    return token


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


@router.get("/github/login", summary="Start the GitHub OAuth web flow")
async def github_login(request: Request) -> RedirectResponse:
    settings = get_settings()
    if not oauth_configured():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="GitHub OAuth is not configured")
    state = secrets.token_urlsafe(32)
    redirect_uri = (
        settings.github_redirect_url
        or str(request.url.replace(query=""))
    )
    params = urlencode({
        "client_id": settings.github_client_id,
        "redirect_uri": redirect_uri,
        "scope": "read:user",
        "state": state,
    })
    response = RedirectResponse(f"https://github.com/login/oauth/authorize?{params}", status_code=303)
    response.set_cookie(
        OAUTH_STATE_COOKIE, state, max_age=STATE_TTL_SECONDS, **_cookie_params()
    )
    return response


@router.get("/github/callback", summary="Finish the GitHub OAuth web flow")
async def github_callback(
    request: Request,
    code: str = "",
    state: str = "",
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    if not oauth_configured():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="GitHub OAuth is not configured")
    expected_state = request.cookies.get(OAUTH_STATE_COOKIE)
    frontend = _frontend_url(request)
    if not code or not expected_state or not state or not secrets.compare_digest(expected_state, state):
        return RedirectResponse(f"{frontend}/?auth_error=state_mismatch", status_code=303)
    access_token = await exchange_code_for_token(code, str(request.url.replace(query="")))
    user = await get_or_create_user_from_github(access_token, db)
    response = RedirectResponse(f"{frontend}/projects", status_code=303)
    response.set_cookie(
        SESSION_COOKIE, create_session_token(user.id), max_age=SESSION_TTL_SECONDS, **_cookie_params()
    )
    response.delete_cookie(OAUTH_STATE_COOKIE)
    return response


@router.get("/logout", summary="Clear the local session")
async def logout(request: Request) -> RedirectResponse:
    response = RedirectResponse(_frontend_url(request), status_code=303)
    response.delete_cookie(SESSION_COOKIE)
    return response


async def require_development_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is not None:
        return user
    user = User(github_id=1001, github_login="demo-dev", name="Demo Developer")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def require_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Authenticate via OAuth session cookie when GitHub is configured;
    otherwise fall back to the single-user development identity."""
    if oauth_configured():
        token = request.cookies.get(SESSION_COOKIE)
        if not token:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        try:
            user_id = read_session_user_id(token)
        except (BadSignature, SignatureExpired, ValueError):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from None
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Session user no longer exists")
        return user
    if get_settings().environment != "local":
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Production auth requires OAuth configuration")
    return await require_development_user(credentials, db)
