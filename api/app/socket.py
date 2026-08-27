import uuid
from datetime import UTC, datetime

import socketio
from sqlalchemy import select

from app.auth import SESSION_COOKIE, oauth_configured, read_session_user_id
from app.db import SessionLocal
from app.models import Conversation, Match, Message, User

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


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


async def _authenticate(environ: dict) -> User | None:
    if not oauth_configured():
        async with SessionLocal() as db:
            result = await db.execute(select(User).limit(1))
            return result.scalar_one_or_none()
    token = _session_cookie_value(environ)
    if not token:
        return None
    try:
        user_id = read_session_user_id(token)
    except Exception:
        return None
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


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
    user = await _authenticate(environ)
    if user is None:
        await sio.emit("error", {"detail": "Authentication required"}, to=sid)
        await sio.disconnect(sid)
        return False
    await sio.save_session(sid, {"user_id": str(user.id), "user_login": user.github_login})
    return True


@sio.event
async def join(sid, data):
    session = await sio.get_session(sid)
    user_id = uuid.UUID(session["user_id"])
    conversation_id = uuid.UUID(str(data.get("conversation_id")))
    if not await _can_access_conversation(conversation_id, user_id):
        await sio.emit("error", {"detail": "Forbidden"}, to=sid)
        return
    await sio.enter_room(sid, f"conversation:{conversation_id}")


@sio.event
async def message(sid, data):
    session = await sio.get_session(sid)
    user_id = uuid.UUID(session["user_id"])
    body = str(data.get("body", "")).strip()
    if not body:
        return
    conversation_id = uuid.UUID(str(data.get("conversation_id")))
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