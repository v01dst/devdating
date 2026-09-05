import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


async def notify(
    db: AsyncSession, user_id: uuid.UUID, type: str, title: str, body: str = "", link: str = ""
) -> Notification:
    n = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
    db.add(n)
    await db.flush()
    return n
