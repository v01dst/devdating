import asyncio
import os
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_factory
from app.models import Issue, Project

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_CLIENT_SECRET")


def github_headers():
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "DevDating"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


async def search_repositories(session: AsyncSession, languages: list[str], per_language: int = 5):
    added = 0
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=github_headers(), timeout=30) as client:
        for language in languages:
            response = await client.get(
                "/search/repositories",
                params={
                    "q": f'good-first-issue language:{language} archived:false stars:>50',
                    "sort": "updated",
                    "order": "desc",
                    "per_page": per_language,
                },
            )
            if response.status_code != 200:
                continue
            for item in response.json().get("items", []):
                repo_url = item["html_url"]
                existing = await session.execute(select(Project).where(Project.repo_url == repo_url))
                project = existing.scalar_one_or_none()
                if project is None:
                    project = Project(github_repo_id=item["id"], repo_url=repo_url)
                    session.add(project)
                project.owner_login = item["owner"]["login"]
                project.name = item["name"]
                project.description = item.get("description")
                project.languages = [language]
                project.topics = item.get("topics", [])[:10]
                project.license_spdx = (item.get("license") or {}).get("spdx_id")
                project.stars = item["stargazers_count"]
                project.forks = item["forks_count"]
                project.issue_count = item["open_issues_count"]
                project.is_archived = bool(item["archived"])
                activity = min(100, item["stargazers_count"] / 200 + item["forks_count"] / 40 + min(item["open_issues_count"], 100) / 2)
                project.activity_score = round(activity, 2)
                project.difficulty_level = 2
                project.synced_at = datetime.now(UTC)
                added += 1
        await session.commit()
    return {"projects_processed": added}


GOOD_LABELS = {"good first issue", "beginner", "documentation", "help wanted", "easy"}


async def fetch_issues_for_projects(session: AsyncSession, per_project: int = 20):
    result = await session.execute(select(Project).order_by(Project.activity_score.desc()).limit(30))
    projects = result.scalars().all()
    issues_added = 0
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=github_headers(), timeout=30) as client:
        for project in projects:
            response = await client.get(f"/repos/{project.owner_login}/{project.name}/issues", params={
                "state": "open", "per_page": per_project, "sort": "updated", "direction": "desc"
            })
            if response.status_code != 200:
                continue
            for item in response.json():
                if "pull_request" in item:
                    continue
                labels = {label["name"].lower() for label in item.get("labels", [])}
                if not labels & GOOD_LABELS:
                    continue
                existing = await session.execute(
                    select(Issue).where(Issue.project_id == project.id, Issue.issue_number == item["number"])
                )
                issue = existing.scalar_one_or_none()
                if issue is None:
                    issue = Issue(project_id=project.id, issue_number=item["number"])
                    session.add(issue)
                issue.title = item["title"]
                issue.body = (item.get("body") or "")[:8000]
                issue.url = item["html_url"]
                issue.labels = sorted(labels & GOOD_LABELS)
                issue.state = item["state"].upper()
                issue.assignees = len(item.get("assignees", []))
                issue.comments_count = item.get("comments", 0)
                if item.get("created_at"):
                    issue.opened_at = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                if item.get("updated_at"):
                    issue.updated_at_github = datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00"))
                issues_added += 1
        await session.commit()
    return {"issues_processed": issues_added, "projects_scanned": len(projects)}


async def sync_all(languages: list[str]):
    async with async_session_factory() as session:
        projects = await search_repositories(session, languages)
        issues = await fetch_issues_for_projects(session)
    return {"projects": projects, "issues": issues}
