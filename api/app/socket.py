import uuid
from datetime import UTC, datetime

import socketio
from sqlalchemy import select

from app.auth import (
    SESSION_COOKIE,
    oauth_configured,
    read_session_user_id,
    read_socket_token,
)
from app.config import get_settings
from app.db import SessionLocal
from app.models import Conversation, Match, Message, User


def _allowed_socket_origins() -> list[str]:
    """Explicit local origins only.

    The client page and the API both run on this machine; a wildcard would let
    any website open an authenticated socket to localhost. Non-browser clients
    (no Origin header) are unaffected.
    """
    origins = {get_settings().web_origin.rstrip("/")}
    for host in ("http://localhost", "http://127.0.0.1"):
        for port in ("3000", "3100"):
            origins.add(f"{host}:{port}")
    origins.discard("")
    return sorted(origins)


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=_allowed_socket_origins())


def _extract_cookie(environ: dict) -> str:
    raw = environ.get("asgi.scope", {}).get("headers", [])
    for key, value in raw:
        if key == b"cookie":
            return value.decode()
    return ""


def _session_cookie_value(environ: dict) -> str | None:
    cookie = _extract_cookie(environ)
    for part in cookie.split(";"):
        name, _, value = part.strip().partition("=")
        if name == SESSION_COOKIE and value:
            return value
    return None


def _parse_uuid(value) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        return None


async def _authenticate(environ: dict, auth: dict | None = None) -> User | None:
    """Resolve the socket identity: token first, then cookie, then dev fallback.

    The web client passes a short-lived token in the handshake `auth` payload
    because cross-origin WebSockets do not reliably carry the session cookie.
    """
    user_id: uuid.UUID | None = None
    token = str((auth or {}).get("token") or "").strip()
    if token:
        try:
            user_id = read_socket_token(token)
        except Exception:
            user_id = None
    if user_id is None:
        cookie = _session_cookie_value(environ)
        if cookie:
            try:
                user_id = read_session_user_id(cookie)
            except Exception:
                user_id = None
    if user_id is not None:
        async with SessionLocal() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
    if not oauth_configured() and get_settings().environment == "local":
        async with SessionLocal() as db:
            result = await db.execute(select(User).limit(1))
            return result.scalar_one_or_none()
    return None


async def _can_access_conversation(conversation_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    async with SessionLocal() as db:
        result = await db.execute(
            select(Conversation.id)
            .join(Match, Conversation.match_id == Match.id)
            .where(Conversation.id == conversation_id, Match.user_id == user_id)
        )
        return result.scalar_one_or_none() is not None


@sio.event
async def connect(sid, environ, auth):
    user = await _authenticate(environ, auth)
    if user is None:
        await sio.emit("error", {"detail": "Authentication required"}, to=sid)
        await sio.disconnect(sid)
        return False
    await sio.save_session(sid, {"user_id": str(user.id), "user_login": user.github_login})
    # Personal room: realtime notifications (matches, messages, approvals).
    await sio.enter_room(sid, f"user:{user.id}")
    return True


@sio.event
async def join(sid, data):
    session = await sio.get_session(sid)
    user_id = uuid.UUID(session["user_id"])
    conversation_id = _parse_uuid((data or {}).get("conversation_id"))
    if conversation_id is None:
        await sio.emit("error", {"detail": "Invalid conversation"}, to=sid)
        return
    if not await _can_access_conversation(conversation_id, user_id):
        await sio.emit("error", {"detail": "Forbidden"}, to=sid)
        return
    await sio.enter_room(sid, f"conversation:{conversation_id}")


@sio.event
async def leave(sid, data):
    conversation_id = _parse_uuid((data or {}).get("conversation_id"))
    if conversation_id is None:
        return
    await sio.leave_room(sid, f"conversation:{conversation_id}")


@sio.event
async def message(sid, data):
    data = data or {}
    session = await sio.get_session(sid)
    user_id = uuid.UUID(session["user_id"])
    # Same cap as the REST schema (schemas.py: body max_length=8000).
    body = str(data.get("body", "")).strip()[:8000]
    if not body:
        return
    conversation_id = _parse_uuid(data.get("conversation_id"))
    if conversation_id is None:
        await sio.emit("error", {"detail": "Invalid conversation"}, to=sid)
        return
    if not await _can_access_conversation(conversation_id, user_id):
        await sio.emit("error", {"detail": "Forbidden"}, to=sid)
        return
    now = datetime.now(UTC)
    async with SessionLocal() as db:
        message = Message(
            conversation_id=conversation_id, sender_user_id=user_id, body=body, created_at=now
        )
        db.add(message)
        result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conversation = result.scalar_one_or_none()
        if conversation is not None:
            conversation.last_message_at = now
        await db.commit()
        await db.refresh(message)
        payload = {
            "id": str(message.id),
            "conversation_id": str(conversation_id),
            "sender_user_id": str(user_id),
            "body": body,
            "created_at": message.created_at.isoformat(),
        }
    await sio.emit("message", payload, room=f"conversation:{conversation_id}")


@sio.event
async def disconnect(sid):
    pass
