"""Advance contribution states from the contributor's GitHub PR activity.

The sync is best-effort by design: GitHub may be unreachable or rate-limited,
so failures are reported per repository and never break the API request. Only
*advancing* transitions are applied automatically (CLAIMED -> PR_OPEN -> MERGED);
regressions (e.g. a closed, unmerged PR) stay untouched for manual editing.
"""

import re
from collections import defaultdict
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.github_ingest import github_headers
from app.models import Contribution, ContributionState, Notification, User
from app.notifications import notify, push_notification

#: Repos re-checked per sync call (guards against unbounded GitHub traffic).
MAX_REPOS_PER_SYNC = 10
#: Non-forced syncs skip repos checked more recently than this.
SYNC_TTL = timedelta(minutes=10)
REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
#: Local issue references like "#123"; owner/repo#123 mentions are excluded.
ISSUE_REF_PATTERN = re.compile(r"(?<![\w/])#(\d+)\b")

FetchFn = Callable[[str, str], Awaitable[list[dict]]]


def parse_issue_refs(*texts: str | None) -> set[int]:
    refs: set[int] = set()
    for text in texts:
        if not text:
            continue
        refs.update(int(match) for match in ISSUE_REF_PATTERN.findall(text))
    return refs


def normalize_pr(item: dict) -> dict | None:
    """Normalize a GitHub `type:pr` search result; None for closed, unmerged PRs."""
    meta = item.get("pull_request") or {}
    if meta.get("merged_at"):
        state: ContributionState | None = ContributionState.MERGED
    elif item.get("state") == "open":
        state = ContributionState.PR_OPEN
    else:
        state = None
    number = item.get("number")
    if number is None:
        return None
    return {
        "number": int(number),
        "url": item.get("html_url") or "",
        "state": state,
        "updated_at": str(item.get("updated_at") or ""),
        "refs": parse_issue_refs(item.get("title"), item.get("body")),
    }


def select_best_pr(candidates: list[dict], issue_number: int) -> dict | None:
    """Prefer a merged PR for the issue; otherwise the most recently updated open one."""
    matches = [
        candidate
        for candidate in candidates
        if candidate["state"] is not None and issue_number in candidate["refs"]
    ]
    if not matches:
        return None
    matches.sort(key=lambda candidate: candidate["updated_at"], reverse=True)
    priority = {ContributionState.MERGED: 0, ContributionState.PR_OPEN: 1}
    matches.sort(key=lambda candidate: priority[candidate["state"]])
    return matches[0]


async def fetch_contributor_prs(repo: str, login: str) -> list[dict]:
    """All PRs the given login authored in the repo (single search call)."""
    async with httpx.AsyncClient(
        base_url="https://api.github.com", headers=github_headers(), timeout=30
    ) as client:
        response = await client.get(
            "/search/issues",
            params={
                "q": f"repo:{repo} type:pr author:{login}",
                "sort": "updated",
                "order": "desc",
                "per_page": 100,
            },
        )
    if response.status_code != 200:
        raise RuntimeError(f"GitHub responded {response.status_code}")
    return response.json().get("items", [])


def _as_utc(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; treat stored values as UTC."""
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _advances(current: ContributionState, new: ContributionState) -> bool:
    if new == ContributionState.MERGED:
        return current != ContributionState.MERGED
    if new == ContributionState.PR_OPEN:
        return current in {ContributionState.INTERESTED, ContributionState.CLAIMED}
    return False


async def sync_contributions(
    db: AsyncSession,
    user: User,
    *,
    force: bool = False,
    fetch: FetchFn | None = None,
) -> dict[str, Any]:
    fetch = fetch or fetch_contributor_prs
    now = datetime.now(UTC)

    result = await db.execute(
        select(Contribution).where(
            Contribution.user_id == user.id,
            Contribution.state != ContributionState.MERGED,
        )
    )
    tracked = [c for c in result.scalars().all() if c.repo and REPO_PATTERN.match(c.repo)]
    by_repo: dict[str, list[Contribution]] = defaultdict(list)
    for contribution in tracked:
        by_repo[contribution.repo].append(contribution)

    login = (user.github_login or "").strip()
    updated: list[Contribution] = []
    errors: list[dict[str, str]] = []
    pushed: list[Notification] = []
    repos_checked = checked_items = skipped_recent = 0

    if login:
        for repo, items in list(by_repo.items())[:MAX_REPOS_PER_SYNC]:
            freshest = max(
                (v for c in items if (v := _as_utc(c.last_synced_at)) is not None), default=None
            )
            if not force and freshest is not None and (now - freshest) < SYNC_TTL:
                skipped_recent += len(items)
                continue
            try:
                raw = await fetch(repo, login)
                candidates = [c for pr in raw if (c := normalize_pr(pr)) is not None]
            except Exception as exc:  # noqa: BLE001 - reported per repo, never fatal
                errors.append({"repo": repo, "error": f"{type(exc).__name__}: {exc}"[:160]})
                continue
            repos_checked += 1
            for contribution in items:
                checked_items += 1
                best = select_best_pr(candidates, contribution.issue_number)
                if best is not None and _advances(contribution.state, best["state"]):
                    contribution.state = best["state"]
                    contribution.pr_url = best["url"]
                    verb = "Merged" if best["state"] == ContributionState.MERGED else "Pull request detected for"
                    pushed.append(
                        await notify(
                            db,
                            user.id,
                            "SYSTEM",
                            f"{verb} {repo}#{contribution.issue_number}",
                            best["url"],
                            "/contributions",
                        )
                    )
                    updated.append(contribution)
                contribution.last_synced_at = now
    elif tracked:
        errors.append({"repo": "-", "error": "No GitHub login on the profile; PR lookup skipped."})

    await db.commit()
    for notification in pushed:
        await push_notification(notification)

    return {
        "repos_checked": repos_checked,
        "contributions_checked": checked_items,
        "skipped_recent": skipped_recent,
        "updated": updated,
        "errors": errors,
    }
