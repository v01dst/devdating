import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import require_development_user
from app.db import get_db
from app.github_ingest import sync_all
from app.issues import estimate_issue_difficulty
from app.matching import build_reasons, calculate_compatibility
from app.models import Conversation, Issue, IssueRecommendation, Match, MatchStatus, Message, Project, Swipe, SwipeDirection, User
from app.schemas import (
    DiscoveryCard,
    MatchRead,
    MessageCreate,
    MessageRead,
    ProjectRead,
    SwipeCreate,
    UserPreferencesUpdate,
    UserRead,
)

router = APIRouter(prefix="/api/v1")


async def _get_owned_match(match_id: uuid.UUID, user: User, db: AsyncSession) -> Match:
    result = await db.execute(
        select(Match)
        .options(joinedload(Match.project), joinedload(Match.conversation))
        .where(Match.id == match_id, Match.user_id == user.id)
    )
    match = result.scalar_one_or_none()
    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match


@router.get("/healthz", include_in_schema=False)
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
async def read_current_user(user: User = Depends(require_development_user)) -> User:
    return user


@router.patch("/me/preferences", response_model=UserRead)
async def update_preferences(
    payload: UserPreferencesUpdate,
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    updates = payload.model_dump(exclude_unset=True)
    if "tech_stack" in updates:
        user.tech_stack = [item.strip().lower() for item in updates["tech_stack"] if item.strip()]
    if "domains" in updates:
        user.domains = [item.strip().lower() for item in updates["domains"] if item.strip()]
    if "availability" in updates and updates["availability"]:
        user.availability = {"level": updates.pop("availability")}
    preferences = user.preferences.copy()
    for key, value in updates.items():
        if key != "availability":
            preferences[key] = value
    user.preferences = preferences
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/discovery/cards", response_model=list[DiscoveryCard])
async def discovery_cards(
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> list[DiscoveryCard]:
    swiped_subquery = select(Swipe.project_id).where(Swipe.user_id == user.id).scalar_subquery()
    result = await db.execute(
        select(Project)
        .where(Project.is_archived.is_(False), Project.issue_count > 0, Project.id.not_in(swiped_subquery))
        .order_by(Project.activity_score.desc())
        .limit(limit * 3)
    )
    projects = result.scalars().all()
    scored: list[tuple[float, dict, Project]] = []
    experience_value = {
        "NEWCOMER": 0,
        "BEGINNER": 1,
        "INTERMEDIATE": 2,
        "ADVANCED": 3,
        "EXPERT": 4,
    }[user.experience_level.value]
    for project in projects:
        score, breakdown = calculate_compatibility(
            user_tech_stack=user.tech_stack,
            project_languages=project.languages,
            user_experience_level=experience_value,
            project_difficulty_level=float(project.difficulty_level),
            project_activity_score=float(project.activity_score),
            project_contributor_count=project.contributor_count,
            project_issue_count=project.issue_count,
        )
        scored.append((score, breakdown, project))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        DiscoveryCard(project=ProjectRead.model_validate(project), compatibility_score=score, reasons=build_reasons(breakdown))
        for score, breakdown, project in scored[:limit]
    ]


@router.post("/swipes", status_code=status.HTTP_201_CREATED)
async def create_swipe(
    payload: SwipeCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    project_result = await db.execute(select(Project).where(Project.id == payload.project_id))
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")

    existing_result = await db.execute(
        select(Swipe).where(Swipe.user_id == user.id, Swipe.project_id == project.id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Project already swiped")

    experience_value = {
        "NEWCOMER": 0,
        "BEGINNER": 1,
        "INTERMEDIATE": 2,
        "ADVANCED": 3,
        "EXPERT": 4,
    }[user.experience_level.value]
    score, breakdown = calculate_compatibility(
        user_tech_stack=user.tech_stack,
        project_languages=project.languages,
        user_experience_level=experience_value,
        project_difficulty_level=float(project.difficulty_level),
        project_activity_score=float(project.activity_score),
        project_contributor_count=project.contributor_count,
        project_issue_count=project.issue_count,
    )
    swipe = Swipe(
        user_id=user.id,
        project_id=project.id,
        direction=payload.direction,
        score_at_swipe=score,
        score_features=breakdown,
        client_request_id=payload.client_request_id,
    )
    db.add(swipe)

    match_created = False
    match: Match | None = None
    if payload.direction in {SwipeDirection.LIKE, SwipeDirection.SUPER_LIKE} and score >= 65:
        match_result = await db.execute(
            select(Match).where(Match.user_id == user.id, Match.project_id == project.id)
        )
        match = match_result.scalar_one_or_none()
        if match is None:
            auto_match = True
            match = Match(
                user_id=user.id,
                project_id=project.id,
                status=MatchStatus.MATCHED if auto_match else MatchStatus.PENDING_PROJECT,
                compatibility_score=score,
                score_breakdown=breakdown,
                initiated_by="DEVELOPER",
                matched_at=datetime.now(UTC) if auto_match else None,
            )
            db.add(match)
            match_created = True

    await db.commit()
    if match is not None:
        background_tasks.add_task(create_issue_recommendation_task, match.id)
    return {
        "swipe_id": str(swipe.id),
        "compatibility_score": score,
        "match_created": match_created,
        "match_status": match.status if match else None,
    }


async def create_issue_recommendation_task(match_id: uuid.UUID) -> None:
    from app.db import SessionLocal

    async with SessionLocal() as db:
        result = await db.execute(select(Match).options(joinedload(Match.project)).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        if match is None or match.status != MatchStatus.MATCHED:
            return
        existing_result = await db.execute(
            select(IssueRecommendation).where(IssueRecommendation.match_id == match.id)
        )
        if existing_result.scalar_one_or_none() is not None:
            return
        project = match.project
        issue_number = max(1, project.issue_count)
        difficulty, confidence, rationale = estimate_issue_difficulty(
            title="Starter improvement",
            labels=["good first issue"],
            comments_count=1,
            body_length=700,
        )
        recommendation = IssueRecommendation(
            match_id=match.id,
            project_id=project.id,
            issue_number=issue_number,
            title=f"#{issue_number}: Starter improvement",
            url=f"{project.repo_url}/issues/{issue_number}",
            difficulty_score=difficulty,
            confidence=confidence,
            rationale=rationale,
            features={"labels": ["good first issue"], "source": "placeholder-sync"},
            stale_at=datetime.now(UTC) + timedelta(days=7),
        )
        db.add(recommendation)
        conversation = Conversation(match_id=match.id)
        db.add(conversation)
        await db.commit()


@router.get("/matches", response_model=list[MatchRead])
async def list_matches(
    user: User = Depends(require_development_user), db: AsyncSession = Depends(get_db)
) -> list[Match]:
    result = await db.execute(
        select(Match).where(Match.user_id == user.id).order_by(Match.created_at.desc()).limit(100)
    )
    return list(result.scalars().all())


@router.get("/matches/{match_id}", response_model=MatchRead)
async def read_match(
    match_id: uuid.UUID,
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> Match:
    return await _get_owned_match(match_id, user, db)


@router.get("/matches/{match_id}/issue-recommendation")
async def get_issue_recommendation(
    match_id: uuid.UUID,
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_owned_match(match_id, user, db)
    result = await db.execute(select(IssueRecommendation).where(IssueRecommendation.match_id == match_id))
    recommendation = result.scalar_one_or_none()
    if recommendation is None:
        return {"status": "PENDING"}
    return {
        "id": str(recommendation.id),
        "title": recommendation.title,
        "url": recommendation.url,
        "difficulty_score": float(recommendation.difficulty_score),
        "confidence": float(recommendation.confidence),
        "rationale": recommendation.rationale,
        "status": recommendation.status,
    }


@router.get("/me/recommended-issues")
async def recommended_issues(
    limit: int = Query(default=10, ge=1, le=50),
    language: str | None = None,
    search: str | None = None,
    label: str | None = None,
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
):
    language_filter = language.strip().lower() if language and language.strip() else None
    label_filter = label.strip().lower() if label and label.strip() else None
    search_filter = search.strip().lower() if search and search.strip() else None
    result = await db.execute(
        select(Issue, Project)
        .join(Project, Issue.project_id == Project.id)
        .where(Issue.state == "OPEN", Issue.assignees == 0)
        .order_by(Project.activity_score.desc(), Issue.comments_count.asc())
        .limit(500)
    )
    rows = result.all()
    user_stack = {item.lower() for item in user.tech_stack}
    scored = []
    for issue, project in rows:
        project_languages = {item.lower() for item in project.languages}
        if language_filter and language_filter not in project_languages:
            continue
        if label_filter and not any(label_filter in item.lower() for item in issue.labels):
            continue
        if search_filter and search_filter not in f"{issue.title} {issue.body or ''} {project.name} {project.description or ''}".lower():
            continue
        project_languages = {item.lower() for item in project.languages}
        overlap = len(user_stack & project_languages)
        label_bonus = min(len(issue.labels), 3) * 4
        freshness = max(0, 20 - issue.comments_count * 2)
        score = overlap * 30 + label_bonus + freshness + float(project.activity_score) / 10
        reasons = []
        if overlap:
            reasons.append("Uses a language from your profile")
        reasons.extend([f"Labeled {label}" for label in issue.labels[:2]])
        scored.append({
            "issue_id": str(issue.id), "title": issue.title, "url": issue.url,
            "project_name": project.name, "repo_url": project.repo_url,
            "languages": project.languages, "labels": issue.labels,
            "difficulty": min(100, max(5, issue.comments_count * 8 + len(issue.body or "") / 800)),
            "score": round(score, 2), "reasons": reasons or ["Beginner-friendly open issue"],
        })
    return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]


@router.get("/meta/languages")
async def available_languages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project.languages))
    counts = Counter()
    for (languages,) in result.all():
        for language in languages:
            counts[language] += 1
    return [{"language": name, "count": count} for name, count in counts.most_common(40)]


@router.get("/projects/public")
async def public_projects(
    limit: int = Query(default=24, ge=1, le=100),
    language: str | None = None,
    search: str | None = None,
    topic: str | None = None,
    sort: str = Query(default="activity", pattern="^(activity|stars|issues|name)$"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Project).where(Project.is_archived.is_(False), Project.issue_count > 0)
    if language and language.strip():
        query = query.where(func.lower(Project.languages).contains(language.strip().lower()))
    if topic and topic.strip():
        query = query.where(func.lower(Project.topics).contains(topic.strip().lower()))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            func.lower(Project.name).contains(term.lower())
            | func.lower(func.coalesce(Project.description, "")).contains(term.lower())
        )
    order = {
        "activity": Project.activity_score.desc(),
        "stars": Project.stars.desc(),
        "issues": Project.issue_count.desc(),
        "name": Project.name.asc(),
    }[sort]
    result = await db.execute(query.order_by(order).limit(limit))
    projects = result.scalars().all()
    return [
        {
            "id": str(project.id),
            "repo_url": project.repo_url,
            "owner_login": project.owner_login,
            "name": project.name,
            "description": project.description,
            "languages": project.languages,
            "topics": project.topics[:8],
            "stars": project.stars,
            "forks": project.forks,
            "open_issues": project.issue_count,
            "activity_score": float(project.activity_score),
            "license": project.license_spdx,
        }
        for project in projects
    ]


@router.get("/me/community-questions")
async def community_questions(
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Issue, Project)
        .join(Project, Issue.project_id == Project.id)
        .order_by(Project.activity_score.desc(), Issue.comments_count.desc())
        .limit(limit * 3)
    )
    rows = result.all()
    stack = {item.lower() for item in user.tech_stack}
    output = []
    for issue, project in rows:
        text = f"{issue.title} {issue.body or ''}".lower()
        question_like = bool(issue.labels) or "?" in text or any(p in text for p in ["how do i", "how to", "help"])
        if not question_like:
            continue
        overlap = len(stack & {item.lower() for item in project.languages})
        output.append({
            "issue_id": str(issue.id), "title": issue.title, "url": issue.url,
            "project_name": project.name, "repo_url": project.repo_url,
            "languages": project.languages, "labels": issue.labels,
            "comments": issue.comments_count,
            "relevance": overlap * 30 + min(issue.comments_count, 20) + float(project.activity_score) / 10,
            "snippet": (issue.body or "")[:220],
        })
    return sorted(output, key=lambda item: item["relevance"], reverse=True)[:limit]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def create_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> Message:
    result = await db.execute(
        select(Conversation)
        .options(joinedload(Conversation.match))
        .where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None or conversation.match.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    message = Message(conversation_id=conversation.id, sender_user_id=user.id, body=payload.body.strip())
    conversation.last_message_at = message.created_at
    db.add(message)
    db.add(conversation)
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def list_messages(
    conversation_id: uuid.UUID,
    before: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(require_development_user),
    db: AsyncSession = Depends(get_db),
) -> list[Message]:
    query = select(Message).where(Message.conversation_id == conversation_id)
    if before:
        query = query.where(Message.created_at < before)
    query = query.order_by(Message.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/stats/platform")
async def platform_stats(db: AsyncSession = Depends(get_db)) -> dict:
    project_count = await db.scalar(select(func.count(Project.id)))
    user_count = await db.scalar(select(func.count(User.id)))
    match_count = await db.scalar(select(func.count(Match.id)))
    return {"projects": project_count, "users": user_count, "matches": match_count}


@router.post("/admin/sync-github")
async def admin_sync_github(languages: list[str] | None = None):
    return await sync_all(languages or ["Python", "TypeScript"])
