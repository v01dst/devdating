import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app import github_token
from app.auth import oauth_configured, require_user
from app.db import get_db
from app.github_ingest import (
    DEFAULT_EXPANDED_LANGUAGES,
    LABEL_GROUP_QUERIES,
    bulk_index_issues,
    enrich_project_languages,
    resolve_difficulty_range,
    resolve_label_queries,
    sync_all,
)
from app.issues import estimate_issue_difficulty
from app.learning import contribution_readiness, learning_paths
from app.matching import affinity_boost, build_reasons, calculate_compatibility, language_affinity
from app.models import (
    Contribution,
    ContributionState,
    Conversation,
    Issue,
    IssueRecommendation,
    Match,
    MatchStatus,
    Message,
    Notification,
    Project,
    Swipe,
    SwipeDirection,
    SyncRun,
    User,
)
from app.notifications import notify
from app.schemas import (
    ContributionClaim,
    ContributionRead,
    ContributionUpdate,
    DiscoveryCard,
    MatchRead,
    MatchRespond,
    MessageCreate,
    MessageRead,
    NotificationRead,
    ProjectRead,
    StatusRead,
    SwipeCreate,
    SyncRunRead,
    SyncStart,
    TokenStatus,
    TokenUpdate,
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
async def read_current_user(user: User = Depends(require_user)) -> User:
    return user


@router.patch("/me/preferences", response_model=UserRead)
async def update_preferences(
    payload: UserPreferencesUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    updates = payload.model_dump(exclude_unset=True)
    if "tech_stack" in updates:
        user.tech_stack = [item.strip().lower() for item in updates["tech_stack"] if item.strip()]
    if "domains" in updates:
        user.domains = [item.strip().lower() for item in updates["domains"] if item.strip()]
    if updates.get("experience_level") is not None:
        user.experience_level = updates.pop("experience_level")
    if "availability" in updates and updates["availability"]:
        user.availability = {"level": updates.pop("availability")}
    preferences = user.preferences.copy()
    for key, value in updates.items():
        preferences[key] = value
    user.preferences = preferences
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/discovery/cards", response_model=list[DiscoveryCard])
async def discovery_cards(
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(require_user),
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
    swipe_lang_result = await db.execute(
        select(Swipe.direction, Project.languages)
        .join(Project, Swipe.project_id == Project.id)
        .where(Swipe.user_id == user.id)
    )
    affinity = language_affinity([
        (direction.value, language)
        for direction, languages in swipe_lang_result.all()
        for language in (languages or [])
    ])
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
        boost, best_language = affinity_boost(project.languages or [], affinity)
        reasons = build_reasons(breakdown)
        if boost >= 4 and best_language:
            reasons.insert(0, f"You keep liking {best_language} projects")
        final_score = round(min(100.0, score + boost), 2)
        scored.append((final_score, {**breakdown, "affinity": boost}, reasons, project))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        DiscoveryCard(
            project=ProjectRead.model_validate(project),
            compatibility_score=score,
            reasons=reasons,
        )
        for score, breakdown, reasons, project in scored[:limit]
    ]


@router.post("/swipes", status_code=status.HTTP_201_CREATED)
async def create_swipe(
    payload: SwipeCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_user),
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
            # Projects with a claimed maintainer require two-way consent.
            needs_maintainer = project.maintainer_user_id is not None
            auto_match = not needs_maintainer
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

    if match_created:
        await notify(db, user.id, "MATCH", f"Matched {project.name}", f"Score {score}", "/matches")
    await db.commit()
    if match is not None:
        background_tasks.add_task(create_issue_recommendation_task, match.id)
    return {
        "swipe_id": str(swipe.id),
        "compatibility_score": score,
        "match_created": match_created,
        "match_status": match.status if match else None,
        "match_id": str(match.id) if match else None,
    }


@router.delete("/swipes/last")
async def undo_last_swipe(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove the newest swipe; also drop its match if still awaiting the maintainer."""
    result = await db.execute(
        select(Swipe)
        .where(Swipe.user_id == user.id)
        .order_by(Swipe.created_at.desc())
        .limit(1)
    )
    swipe = result.scalar_one_or_none()
    if swipe is None:
        return {"undone": False, "project_id": None, "removed_match": False}
    project_id = str(swipe.project_id)
    removed_match = False
    pending = await db.scalar(
        select(Match).where(
            Match.user_id == user.id,
            Match.project_id == swipe.project_id,
            Match.status == MatchStatus.PENDING_PROJECT,
        )
    )
    if pending is not None:
        await db.delete(pending)
        removed_match = True
    await db.delete(swipe)
    await db.commit()
    return {"undone": True, "project_id": project_id, "removed_match": removed_match}


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
        candidate_result = await db.execute(
            select(Issue)
            .where(
                Issue.project_id == project.id,
                Issue.state == "OPEN",
                Issue.assignees == 0,
            )
            .order_by(Issue.difficulty_score.asc(), Issue.comments_count.asc())
            .limit(1)
        )
        issue = candidate_result.scalar_one_or_none()
        if issue is not None:
            difficulty, confidence = float(issue.difficulty_score), float(issue.difficulty_confidence)
            title, url = f"#{issue.issue_number}: {issue.title}", issue.url
            rationale_bits = [f"labeled {label}" for label in issue.labels[:2] if label]
            rationale = ", ".join(rationale_bits) or "easiest open unassigned issue in this repository"
            features = {"labels": issue.labels, "source": "indexed-issues", "issue_id": str(issue.id)}
        else:
            difficulty, confidence, rationale = estimate_issue_difficulty(
                title="Starter improvement",
                labels=["good first issue"],
                comments_count=1,
                body_length=700,
            )
            issue_number = max(1, project.issue_count)
            title = f"#{issue_number}: Starter improvement"
            url = f"{project.repo_url}/issues/{issue_number}"
            features = {"labels": ["good first issue"], "source": "placeholder-sync"}
        recommendation = IssueRecommendation(
            match_id=match.id,
            project_id=project.id,
            issue_number=issue.issue_number if issue is not None else max(1, project.issue_count),
            title=title,
            url=url,
            difficulty_score=difficulty,
            confidence=confidence,
            rationale=rationale,
            features=features,
            stale_at=datetime.now(UTC) + timedelta(days=7),
        )
        db.add(recommendation)
        conversation = Conversation(match_id=match.id)
        db.add(conversation)
        await db.commit()


@router.get("/matches", response_model=list[MatchRead])
async def list_matches(
    user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
) -> list[Match]:
    result = await db.execute(
        select(Match)
        .options(joinedload(Match.project), joinedload(Match.conversation))
        .where(Match.user_id == user.id)
        .order_by(Match.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().unique().all())


@router.get("/matches/{match_id}", response_model=MatchRead)
async def read_match(
    match_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> Match:
    result = await db.execute(
        select(Match)
        .options(joinedload(Match.project), joinedload(Match.conversation))
        .where(Match.id == match_id, Match.user_id == user.id)
    )
    match = result.scalars().unique().one_or_none()
    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match


@router.get("/matches/{match_id}/issue-recommendation")
async def get_issue_recommendation(
    match_id: uuid.UUID,
    user: User = Depends(require_user),
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


@router.post("/projects/{project_id}/claim", status_code=status.HTTP_201_CREATED)
async def claim_project(
    project_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.maintainer_user_id is not None and project.maintainer_user_id != user.id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Project already has a maintainer")
    project.maintainer_user_id = user.id
    project.maintainer_verified = oauth_configured()
    await db.commit()
    return {"project_id": str(project.id), "claimed": True, "verified": project.maintainer_verified}


@router.get("/me/maintained-projects")
async def maintained_projects(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Project).where(Project.maintainer_user_id == user.id).order_by(Project.name.asc())
    )
    projects = result.scalars().all()
    return [
        {
            "id": str(project.id),
            "owner_login": project.owner_login,
            "name": project.name,
            "repo_url": project.repo_url,
            "stars": project.stars,
            "verified": project.maintainer_verified,
        }
        for project in projects
    ]


@router.get("/me/incoming-matches")
async def incoming_matches(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Match, Project, User)
        .join(Project, Match.project_id == Project.id)
        .join(User, Match.user_id == User.id)
        .where(Project.maintainer_user_id == user.id, Match.status == MatchStatus.PENDING_PROJECT)
        .order_by(Match.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "match_id": str(match.id),
            "compatibility_score": float(match.compatibility_score),
            "created_at": match.created_at.isoformat(),
            "developer": developer.github_login,
            "project": project.name,
        }
        for match, project, developer in rows
    ]


@router.post("/matches/{match_id}/respond", response_model=MatchRead)
async def respond_to_match(
    match_id: uuid.UUID,
    payload: MatchRespond,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> Match:
    result = await db.execute(
        select(Match)
        .options(joinedload(Match.project), joinedload(Match.conversation))
        .where(Match.id == match_id)
    )
    match = result.scalars().unique().one_or_none()
    if match is None or match.project.maintainer_user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.status != MatchStatus.PENDING_PROJECT:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Match already resolved")
    if payload.accept:
        match.status = MatchStatus.MATCHED
        match.matched_at = datetime.now(UTC)
        await notify(db, match.user_id, "APPROVAL", f"Match accepted for {match.project.name}", "", "/matches")
        await db.commit()
        background_tasks.add_task(create_issue_recommendation_task, match.id)
    else:
        match.status = MatchStatus.DECLINED
        await db.commit()
    await db.refresh(match)
    return match


@router.get("/me/recommended-issues")
async def recommended_issues(
    limit: int = Query(default=10, ge=1, le=50),
    language: str | None = None,
    search: str | None = None,
    label: str | None = None,
    sort: str = Query(default="fit", pattern="^(fit|latest|easy)$"),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    language_filter = language.strip().lower() if language and language.strip() else None
    label_filter = label.strip().lower() if label and label.strip() else None
    search_filter = search.strip().lower() if search and search.strip() else None
    result = await db.execute(
        select(Issue, Project)
        .join(Project, Issue.project_id == Project.id)
        .where(
            Issue.state == "OPEN",
            Issue.assignees == 0,
            Issue.comments_count <= 20,
            func.length(func.coalesce(Project.description, "")) > 30,
        )
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
        if search_filter and search_filter not in (
            f"{issue.title} {issue.body or ''} {project.name} {project.description or ''}".lower()
        ):
            continue
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
            "difficulty": float(issue.difficulty_score),
            "opened_at": issue.opened_at.isoformat() if issue.opened_at else None,
            "score": round(score, 2), "reasons": reasons or ["Beginner-friendly open issue"],
            "_opened": issue.opened_at, "_difficulty": float(issue.difficulty_score),
        })
    if sort == "latest":
        scored.sort(key=lambda item: (item["_opened"] is not None, item["_opened"]), reverse=True)
    elif sort == "easy":
        scored.sort(key=lambda item: item["_difficulty"])
    else:
        scored.sort(key=lambda item: item["score"], reverse=True)
    return [
        {key: value for key, value in item.items() if not key.startswith("_")}
        for item in scored[:limit]
    ]


@router.get("/me/dashboard")
async def my_dashboard(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    recent = await db.execute(
        select(Issue)
        .options(joinedload(Issue.project))
        .join(Project, Issue.project_id == Project.id)
        .order_by(Issue.created_at.desc())
        .limit(300)
    )
    issues = list(recent.scalars().unique().all())
    readiness = contribution_readiness(issues, user.tech_stack or [])
    paths = learning_paths(user.tech_stack or [], user.experience_level.value)
    swipe_rows = await db.execute(
        select(Swipe.direction, func.count())
        .where(Swipe.user_id == user.id)
        .group_by(Swipe.direction)
    )
    counts = {direction.value: count for direction, count in swipe_rows.all()}
    swipes_total = sum(counts.values())
    match_total = await db.scalar(select(func.count(Match.id)).where(Match.user_id == user.id))
    return {
        "readiness": readiness,
        "paths": paths,
        "stats": {
            "swipes": swipes_total,
            "likes": counts.get("LIKE", 0) + counts.get("SUPER_LIKE", 0),
            "passes": counts.get("PASS", 0),
            "matches": match_total or 0,
            "indexed_issues_seen": len(issues),
        },
    }


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
    sort: str = Query(default="activity", pattern="^(activity|stars|issues|name|latest)$"),
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
    orders = {
        "activity": [Project.activity_score.desc()],
        "stars": [Project.stars.desc()],
        "issues": [Project.issue_count.desc()],
        "name": [Project.name.asc()],
        "latest": [Project.synced_at.desc().nullslast(), Project.created_at.desc()],
    }[sort]
    result = await db.execute(query.order_by(*orders).limit(limit))
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
            "synced_at": project.synced_at.isoformat() if project.synced_at else None,
        }
        for project in projects
    ]




@router.get("/me/community-questions")
async def community_questions(
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(require_user),
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


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    user: User = Depends(require_user),
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
    now = datetime.now(UTC)
    message = Message(
        conversation_id=conversation.id, sender_user_id=user.id, body=payload.body.strip(), created_at=now
    )
    conversation.last_message_at = now
    db.add(message)
    db.add(conversation)
    project = await db.get(Project, conversation.match.project_id)
    maintainer_id = project.maintainer_user_id if project is not None else None
    if maintainer_id is not None and maintainer_id != user.id:
        await notify(db, maintainer_id, "MESSAGE", "New message", payload.body.strip()[:200], "/matches")
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def list_messages(
    conversation_id: uuid.UUID,
    before: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[Message]:
    owned_result = await db.execute(
        select(Match.id).join(Conversation, Match.id == Conversation.match_id).where(
            Conversation.id == conversation_id, Match.user_id == user.id
        )
    )
    if owned_result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    query = select(Message).where(Message.conversation_id == conversation_id)
    if before:
        query = query.where(Message.created_at < before)
    direction = Message.created_at.asc() if order == "asc" else Message.created_at.desc()
    query = query.order_by(direction).limit(limit)
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


async def run_index_job(
    run_id: uuid.UUID,
    target: int,
    languages: list[str],
    label_queries: list[str],
    low: float,
    high: float,
    enrich_batch: int,
) -> None:
    from app.db import SessionLocal

    async def report(processed: int) -> None:
        async with SessionLocal() as progress_db:
            progress_run = await progress_db.scalar(select(SyncRun).where(SyncRun.id == run_id))
            if progress_run is not None:
                progress_run.indexed = processed
                await progress_db.commit()

    async with SessionLocal() as db:
        run = await db.scalar(select(SyncRun).where(SyncRun.id == run_id))
        if run is None:
            return
        run.state = "RUNNING"
        await db.commit()
        try:
            result = await bulk_index_issues(
                db,
                target_issues=target,
                languages=languages,
                label_queries=label_queries,
                min_difficulty=low,
                max_difficulty=high,
                on_progress=report,
            )
            if enrich_batch > 0:
                await enrich_project_languages(db, batch_size=enrich_batch)
            run.state = "DONE"
            run.indexed = int(result.get("issues_processed", 0))
        except Exception as exc:
            run.state = "FAILED"
            run.error = str(exc)[:500]
        await db.commit()


@router.post("/admin/sync", response_model=SyncRunRead, status_code=status.HTTP_202_ACCEPTED)
async def start_index_sync(
    payload: SyncStart,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    languages = payload.languages or user.tech_stack or DEFAULT_EXPANDED_LANGUAGES
    groups = payload.label_groups or ["good-first", "help-wanted"]
    unknown = [group for group in groups if group not in LABEL_GROUP_QUERIES]
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown label groups: {', '.join(unknown)}",
        )
    label_queries = resolve_label_queries(groups)
    low, high = resolve_difficulty_range(payload.difficulty)
    run = SyncRun(
        state="QUEUED",
        target=payload.target,
        languages=languages,
        label_groups=groups,
        difficulty=payload.difficulty or "",
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    background_tasks.add_task(
        run_index_job, run.id, payload.target, languages, label_queries, low, high, payload.enrich_batch
    )
    return run


@router.get("/admin/sync/runs/latest", response_model=SyncRunRead | None)
async def latest_sync_run(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SyncRun).order_by(SyncRun.created_at.desc()).limit(1))
    return result.scalar_one_or_none()


@router.get("/status", response_model=StatusRead)
async def get_status(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    pc = await db.scalar(select(func.count()).select_from(Project)) or 0
    ic = await db.scalar(select(func.count()).select_from(Issue)) or 0
    needs = not bool((user.tech_stack or []) or user.onboarding_completed_at)
    return {"project_count": pc, "issue_count": ic, "needs_onboarding": needs, "seeded": pc > 0}

@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return list(r.scalars().all())

@router.patch("/notifications/{nid}/read", response_model=NotificationRead)
async def read_notification(
    nid: uuid.UUID, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    n = await db.scalar(select(Notification).where(Notification.id == nid, Notification.user_id == user.id))
    if n is None:
        raise HTTPException(404, "Not found")
    n.read = True
    await db.commit()
    return n

@router.post("/notifications/read-all")
async def read_all(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
    )
    for n in r.scalars().all():
        n.read = True
    await db.commit()
    return {"ok": True}

@router.get("/contributions", response_model=list[ContributionRead])
async def list_contributions(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(Contribution)
        .where(Contribution.user_id == user.id)
        .order_by(Contribution.created_at.desc())
    )
    rows = r.scalars().all()
    return [
        ContributionRead(
            id=x.id,
            repo=x.repo,
            issue_number=x.issue_number,
            state=x.state.value if hasattr(x.state, "value") else str(x.state),
            pr_url=x.pr_url,
            created_at=x.created_at,
        )
        for x in rows
    ]

@router.post("/contributions/claim", response_model=ContributionRead, status_code=201)
async def claim_contribution(
    payload: ContributionClaim,
    response: Response,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.issue_id is not None:
        issue = await db.get(Issue, payload.issue_id)
        if issue is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Issue not found")
    existing = await db.scalar(
        select(Contribution).where(
            Contribution.user_id == user.id,
            Contribution.repo == payload.repo,
            Contribution.issue_number == payload.issue_number,
            Contribution.state != ContributionState.MERGED,
        )
    )
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return ContributionRead(
            id=existing.id,
            repo=existing.repo,
            issue_number=existing.issue_number,
            state=existing.state.value if hasattr(existing.state, "value") else str(existing.state),
            pr_url=existing.pr_url,
            created_at=existing.created_at,
        )
    c = Contribution(
        user_id=user.id,
        repo=payload.repo,
        issue_number=payload.issue_number,
        issue_id=payload.issue_id,
        state=ContributionState.CLAIMED,
    )
    db.add(c)
    await notify(db, user.id, "SYSTEM", f"Claimed {payload.repo}#{payload.issue_number}", "", "/contributions")
    await db.commit()
    await db.refresh(c)
    return ContributionRead(
        id=c.id, repo=c.repo, issue_number=c.issue_number, state="CLAIMED", pr_url=c.pr_url,
        created_at=c.created_at,
    )

@router.patch("/contributions/{cid}", response_model=ContributionRead)
async def update_contribution(
    cid: uuid.UUID, payload: ContributionUpdate, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)
):
    c = await db.scalar(select(Contribution).where(Contribution.id == cid, Contribution.user_id == user.id))
    if c is None:
        raise HTTPException(404, "Not found")
    c.state = ContributionState(payload.state)
    if payload.pr_url is not None:
        c.pr_url = payload.pr_url
    await db.commit()
    await db.refresh(c)
    return ContributionRead(
        id=c.id, repo=c.repo, issue_number=c.issue_number, state=payload.state, pr_url=c.pr_url,
        created_at=c.created_at,
    )


@router.get("/settings/github-token", response_model=TokenStatus)
async def github_token_status(user: User = Depends(require_user)) -> TokenStatus:
    if not github_token.token_configured():
        return TokenStatus(configured=False)
    return TokenStatus(configured=True, login=github_token.stored_login())


@router.put("/settings/github-token", response_model=TokenStatus)
async def save_github_token(
    payload: TokenUpdate,
    user: User = Depends(require_user),
) -> TokenStatus:
    try:
        info = await github_token.check_github_token(payload.token)
    except ValueError as exc:
        message = str(exc)
        code = status.HTTP_401_UNAUTHORIZED if "rejected" in message else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(code, detail=message) from exc
    github_token.save_token(payload.token.strip(), info.get("login", ""))
    return TokenStatus(
        configured=True,
        login=info.get("login", ""),
        rate_limit=info.get("rate_limit", 0),
        rate_remaining=info.get("rate_remaining", 0),
    )


@router.delete("/settings/github-token", response_model=TokenStatus)
async def delete_github_token(user: User = Depends(require_user)) -> TokenStatus:
    github_token.remove_token()
    return TokenStatus(configured=False)
