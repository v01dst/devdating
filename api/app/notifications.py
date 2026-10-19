import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification
from app.socket import sio


async def notify(
    db: AsyncSession, user_id: uuid.UUID, type: str, title: str, body: str = "", link: str = ""
) -> Notification:
    n = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
    db.add(n)
    await db.flush()
    return n


def notification_payload(n: Notification) -> dict:
    """Serialize a Notification for the realtime channel (matches NotificationRead)."""
    return {
        "id": str(n.id),
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "link": n.link,
        "read": bool(n.read),
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


async def push_notification(n: Notification) -> None:
    """Emit a persisted notification to its owner's user room.

    Realtime push is best-effort: a socket layer problem must never fail the
    REST call that produced the notification (the Inbox still has it).
    """
    try:
        await sio.emit("notification", notification_payload(n), room=f"user:{n.user_id}")
    except Exception:  # noqa: BLE001 - never break the caller over a push failure
        pass
