"""Backfill difficulty scores for issues indexed before the scoring columns existed.

Usage: PYTHONPATH=api python3 scripts/backfill_issue_difficulty.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))

from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal, engine  # noqa: E402
from app.issues import estimate_issue_difficulty  # noqa: E402
from app.models import Issue  # noqa: E402


async def backfill() -> None:
    updated = 0
    async with SessionLocal() as db:
        result = await db.execute(select(Issue).where(Issue.difficulty_score == 0))
        for issue in result.scalars():
            difficulty, confidence, _ = estimate_issue_difficulty(
                title=issue.title,
                labels=list(issue.labels or []),
                comments_count=issue.comments_count,
                body_length=len(issue.body or ""),
            )
            issue.difficulty_score = difficulty
            issue.difficulty_confidence = confidence
            updated += 1
        await db.commit()
    await engine.dispose()
    print(f"Backfilled difficulty for {updated} issues.")


if __name__ == "__main__":
    asyncio.run(backfill())
