import os
import re
from collections import Counter
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_factory
from app.issues import estimate_issue_difficulty
from app.matching import experience_level_from_score, infer_experience_score
from app.models import ExperienceLevel, Issue, Project, User

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_CLIENT_SECRET")


def cli_github_token():
    if GITHUB_TOKEN:
        return GITHUB_TOKEN
    try:
        return os.popen("gh auth token").read().strip()
    except Exception:
        return ""


def github_headers():
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "DevDating"}
    token = GITHUB_TOKEN or cli_github_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
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
                project.languages = list(dict.fromkeys((project.languages or []) + [language]))[:8]
                project.topics = item.get("topics", [])[:10]
                project.license_spdx = (item.get("license") or {}).get("spdx_id")
                project.stars = item["stargazers_count"]
                project.forks = item["forks_count"]
                project.issue_count = item["open_issues_count"]
                project.is_archived = bool(item["archived"])
                activity = min(
                    100,
                    item["stargazers_count"] / 200 + item["forks_count"] / 40 + min(item["open_issues_count"], 100) / 2,
                )
                project.activity_score = round(activity, 2)
                project.difficulty_level = 2
                project.synced_at = datetime.now(UTC)
                added += 1
        await session.commit()
    return {"projects_processed": added}


ISSUE_LABEL_QUERIES = [
    'label:"good first issue"',
    'label:"good-first-issue"',
    'label:"help wanted"',
    'label:beginner',
]

#: UI filter groups for indexing. Keys are the only values the API accepts;
#: values are the GitHub search fragments (server-side map, never client input).
LABEL_GROUP_QUERIES: dict[str, list[str]] = {
    "good-first": ['label:"good first issue"', 'label:"good-first-issue"'],
    "help-wanted": ['label:"help wanted"'],
    "beginner": ["label:beginner"],
    "bug": ['label:bug', 'label:"type: bug"'],
}

#: Difficulty bands over the 0-100 estimated score. Beginner matches the
#: <=35 threshold used across the UI.
DIFFICULTY_RANGES: dict[str, tuple[float, float]] = {
    "beginner": (0, 35),
    "mid": (35, 65),
    "hard": (65, 100),
}


def resolve_label_queries(groups: list[str] | None) -> list[str]:
    """Map UI label-group keys to GitHub search fragments. Unknown keys raise KeyError."""
    if not groups:
        return list(ISSUE_LABEL_QUERIES)
    queries: list[str] = []
    for group in groups:
        queries.extend(LABEL_GROUP_QUERIES[group])
    seen = set()
    return [query for query in queries if not (query in seen or seen.add(query))]  # type: ignore[func-returns-value]


def resolve_difficulty_range(name: str | None) -> tuple[float, float]:
    """Map a UI difficulty name to an inclusive (lo, hi) score band."""
    if not name:
        return (0, 100)
    return DIFFICULTY_RANGES[name]


def difficulty_kept(score: float, low: float, high: float) -> bool:
    return low <= score <= high


def apply_issue_fields(issue: Issue, item: dict, label_filter: set[str] | None = None) -> None:
    """Upsert issue attributes from a GitHub API payload and persist the
    estimated difficulty so recommendations never need placeholder data."""
    labels = sorted({label["name"] for label in item.get("labels", [])})
    if label_filter is not None:
        labels = sorted({name for name in labels if name.lower() in label_filter})
    body = (item.get("body") or "")[:8000]
    comments_count = item.get("comments", 0)
    issue.title = item["title"]
    issue.body = body
    issue.url = item["html_url"]
    issue.labels = labels[:12]
    issue.state = item["state"].upper()
    issue.assignees = len(item.get("assignees", []))
    issue.comments_count = comments_count
    if item.get("created_at"):
        issue.opened_at = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
    if item.get("updated_at"):
        issue.updated_at_github = datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00"))
    difficulty, confidence, _ = estimate_issue_difficulty(
        title=item["title"],
        labels=issue.labels,
        comments_count=comments_count,
        body_length=len(body),
    )
    issue.difficulty_score = difficulty
    issue.difficulty_confidence = confidence


def parse_repo_url(api_repository_url: str):
    match = re.search(r"repos/([^/]+)/([^/]+)$", api_repository_url)
    return (match.group(1), match.group(2)) if match else (None, None)


async def upsert_project_from_search_item(session: AsyncSession, item: dict, fallback_language=None):
    owner, name = parse_repo_url(item["repository_url"])
    if not owner:
        return None
    result = await session.execute(select(Project).where(Project.owner_login == owner, Project.name == name))
    project = result.scalar_one_or_none()
    if project is not None:
        return project
    async with client_for_projects() as client:
        repo_response = await client.get(f"/repos/{owner}/{name}")
    if repo_response.status_code != 200:
        return None
    repo = repo_response.json()
    if repo.get("archived") or repo.get("fork"):
        return None
    duplicate_id = await session.execute(select(Project).where(Project.github_repo_id == repo["id"]))
    project = duplicate_id.scalar_one_or_none()
    if project is not None:
        return project
    project = Project(
        github_repo_id=repo["id"],
        repo_url=repo["html_url"],
        owner_login=owner,
        name=name,
        description=repo.get("description"),
        languages=[fallback_language] if fallback_language else [],
        topics=repo.get("topics", [])[:10],
        license_spdx=(repo.get("license") or {}).get("spdx_id"),
        stars=repo["stargazers_count"],
        forks=repo["forks_count"],
        issue_count=repo["open_issues_count"],
        contributor_count=max(1, min(1000, repo["stargazers_count"] // 50)),
        activity_score=min(
            100, repo["stargazers_count"] / 200 + repo["forks_count"] / 40 + min(repo["open_issues_count"], 100) / 2
        ),
        difficulty_level=2.0,
        synced_at=datetime.now(UTC),
    )
    session.add(project)
    await session.flush()
    return project


def client_for_projects():
    return httpx.AsyncClient(base_url="https://api.github.com", headers=github_headers(), timeout=30)


async def bulk_index_issues(
    session: AsyncSession,
    target_issues: int = 500,
    languages: list[str] | None = None,
    label_queries: list[str] | None = None,
    min_difficulty: float = 0,
    max_difficulty: float = 100,
    on_progress=None,
):
    token = cli_github_token()
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "DevDating"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    processed = 0
    projects_created = 0
    seen_pairs = set()
    language_queries = []
    for label_query in (label_queries or ISSUE_LABEL_QUERIES):
        for language in (languages or [None]):
            language_queries.append(
                f"{label_query} language:{language} state:open" if language else f"{label_query} state:open"
            )
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=headers, timeout=30) as client:
        for query in language_queries:
            for page in range(1, 6):
                response = await client.get(
                    "/search/issues",
                    params={"q": query, "sort": "updated", "order": "desc", "per_page": 100, "page": page},
                )
                if response.status_code != 200:
                    break
                items = response.json().get("items", [])
                if not items:
                    break
                for item in items:
                    if "pull_request" in item:
                        continue
                    owner, name = parse_repo_url(item["repository_url"])
                    if not owner or (owner.lower(), name.lower()) in seen_pairs:
                        continue
                    seen_pairs.add((owner.lower(), name.lower()))
                    existing_project = await session.execute(
                        select(Project).where(Project.owner_login == owner, Project.name == name)
                    )
                    project = existing_project.scalar_one_or_none()
                    if project is None:
                        repo_response = await client.get(f"/repos/{owner}/{name}")
                        if repo_response.status_code != 200:
                            continue
                        repo = repo_response.json()
                        if repo.get("archived") or repo.get("fork"):
                            continue
                        duplicate_id = await session.execute(
                            select(Project).where(Project.github_repo_id == repo["id"])
                        )
                        project = duplicate_id.scalar_one_or_none()
                        if project is None:
                            project = Project(
                                github_repo_id=repo["id"],
                                repo_url=repo["html_url"],
                                owner_login=owner,
                                name=name,
                                description=repo.get("description"),
                                languages=[],
                                topics=repo.get("topics", [])[:10],
                                license_spdx=(repo.get("license") or {}).get("spdx_id"),
                                stars=repo["stargazers_count"],
                                forks=repo["forks_count"],
                                issue_count=repo["open_issues_count"],
                                contributor_count=max(1, min(1000, repo["stargazers_count"] // 50)),
                                activity_score=min(
                                    100,
                                    repo["stargazers_count"] / 200
                                    + repo["forks_count"] / 40
                                    + min(repo["open_issues_count"], 100) / 2,
                                ),
                                difficulty_level=2.0,
                                synced_at=datetime.now(UTC),
                            )
                            session.add(project)
                            await session.flush()
                            projects_created += 1
                    existing_issue = await session.execute(
                        select(Issue).where(Issue.project_id == project.id, Issue.issue_number == item["number"])
                    )
                    issue = existing_issue.scalar_one_or_none()
                    is_new = issue is None
                    if is_new:
                        issue = Issue(project_id=project.id, issue_number=item["number"])
                        session.add(issue)
                    apply_issue_fields(issue, item)
                    if not difficulty_kept(float(issue.difficulty_score), min_difficulty, max_difficulty):
                        # Out-of-band for this run: drop new rows before flush,
                        # detach existing ones so their stored values are untouched.
                        session.expunge(issue)
                        continue
                    processed += 1
                await session.commit()
                if on_progress is not None:
                    await on_progress(processed)
                if processed >= target_issues:
                    break
            if processed >= target_issues:
                break
        if session.in_transaction():
            await session.commit()
    return {"issues_processed": processed, "projects_created": projects_created}


DEFAULT_EXPANDED_LANGUAGES = [
    "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Kotlin",
    "Swift", "C", "C++", "C#", "PHP", "Ruby", "Dart", "Elixir", "Lua",
    "Scala", "Haskell", "Solidity", "Vue", "Svelte",
]


async def enrich_project_languages(session: AsyncSession, batch_size: int = 300):
    result = await session.execute(select(Project).where(Project.languages == []))
    projects = result.scalars().all()
    updated = 0
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=github_headers(), timeout=30) as client:
        for index, project in enumerate(projects[:batch_size]):
            response = await client.get(f"/repos/{project.owner_login}/{project.name}/languages")
            if response.status_code != 200:
                continue
            languages = sorted(response.json().keys(), key=lambda name: -response.json()[name])
            if languages:
                project.languages = languages[:8]
                project.topics = list(dict.fromkeys((project.topics or []) + ["open-source"]))[:12]
                updated += 1
            if (index + 1) % 50 == 0:
                await session.commit()
        await session.commit()
    return {"projects_scanned": min(len(projects), batch_size), "projects_updated": updated}


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
                apply_issue_fields(issue, item, label_filter=GOOD_LABELS)
                issues_added += 1
        await session.commit()
    return {"issues_processed": issues_added, "projects_scanned": len(projects)}


async def sync_all(languages: list[str]):
    async with async_session_factory() as session:
        projects = await search_repositories(session, languages)
        issues = await fetch_issues_for_projects(session)
    return {"projects": projects, "issues": issues}


async def profile_from_github(session: AsyncSession):
    async with httpx.AsyncClient(
        base_url="https://api.github.com",
        headers=github_headers(),
        timeout=30,
    ) as client:
        me = (await client.get("/user")).raise_for_status().json()
        repos = (
            await client.get("/user/repos", params={"per_page": 100, "sort": "updated", "affiliation": "owner"})
        ).json()
    languages = Counter(
        repo["language"] for repo in repos if not repo["fork"] and not repo["archived"] and repo.get("language")
    )
    top_languages = [language for language, _ in languages.most_common(6)]
    result = await session.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(github_id=int(me["id"]), github_login=me["login"], name=me.get("name"))
        session.add(user)
    user.github_id = int(me["id"])
    user.github_login = me["login"]
    user.name = me.get("name")
    user.avatar_url = me.get("avatar_url")
    user.bio = me.get("bio")
    user.tech_stack = top_languages
    experience_score = infer_experience_score(
        public_repos=int(me.get("public_repos") or 0),
        followers=int(me.get("followers") or 0),
        contributions=0,
    )
    user.experience_score = experience_score
    user.experience_level = ExperienceLevel(experience_level_from_score(experience_score))
    await session.commit()
    return {
        "login": me["login"],
        "repositories": len(repos),
        "languages": dict(languages),
        "tech_stack": top_languages,
        "experience_level": user.experience_level.value,
    }


async def sync_personal_discovery(per_language: int = 8):
    async with async_session_factory() as session:
        profile = await profile_from_github(session)
        languages = profile["tech_stack"] or ["TypeScript", "Python"]
        projects = await search_repositories(session, languages, per_language)
        issues = await fetch_issues_for_projects(session, per_project=30)
        questions = await fetch_community_questions(session)
    return {"profile": profile, "projects": projects, "issues": issues, "questions": questions}


async def fetch_community_questions(session: AsyncSession, limit_per_project: int = 10):
    result = await session.execute(select(Project).order_by(Project.activity_score.desc()).limit(30))
    projects = result.scalars().all()
    processed = 0
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=github_headers(), timeout=30) as client:
        for project in projects:
            response = await client.get(f"/repos/{project.owner_login}/{project.name}/issues", params={
                "state": "open", "per_page": limit_per_project * 2,
            })
            if response.status_code != 200:
                continue
            for item in response.json():
                labels = {label["name"].lower() for label in item.get("labels", [])}
                title_lower = item["title"].lower()
                body_lower = (item.get("body") or "").lower()
                is_question = bool(labels & {"question", "q&a", "support", "discussion", "needs-triage"}) or any(
                    phrase in f"{title_lower} {body_lower}" for phrase in ["how do i", "how to", "?"]
                )
                if not is_question or "pull_request" in item:
                    continue
                existing = await session.execute(
                    select(Issue).where(Issue.project_id == project.id, Issue.issue_number == item["number"])
                )
                issue = existing.scalar_one_or_none()
                if issue is None:
                    issue = Issue(project_id=project.id, issue_number=item["number"])
                    session.add(issue)
                question_label_filter = {"question", "q&a", "support", "discussion", "needs-triage"}
                apply_issue_fields(issue, item, label_filter=question_label_filter)
                processed += 1
        await session.commit()
    return {"community_questions_processed": processed}
