import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import ExperienceLevel, MatchStatus, SwipeDirection


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    github_id: int
    github_login: str
    name: str | None
    email: str | None
    avatar_url: str | None
    bio: str | None
    experience_level: ExperienceLevel
    tech_stack: list[str]
    domains: list[str]
    preferences: dict = {}
    availability: dict = {}


class UserPreferencesUpdate(BaseModel):
    tech_stack: list[str] | None = Field(default=None, max_length=25)
    domains: list[str] | None = Field(default=None, max_length=25)
    experience_level: ExperienceLevel | None = None
    preferred_project_size: str | None = Field(default=None, pattern="^(small|medium|large)$")
    availability: str | None = Field(default=None, pattern="^(casual|part_time|regular|intense)$")
    open_to_non_primary_languages: bool | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_url: str
    owner_login: str
    name: str
    description: str | None
    languages: list[str]
    topics: list[str]
    stars: int
    forks: int
    issue_count: int
    activity_score: float
    difficulty_level: float
    synced_at: datetime | None = None


class DiscoveryCard(BaseModel):
    project: ProjectRead
    compatibility_score: float
    reasons: list[str]


class SwipeCreate(BaseModel):
    project_id: uuid.UUID
    direction: SwipeDirection
    client_request_id: str | None = Field(default=None, max_length=100)


class MatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: MatchStatus
    compatibility_score: float
    score_breakdown: dict
    initiated_by: str
    matched_at: datetime | None
    created_at: datetime
    project: ProjectRead | None = None
    conversation_id: uuid.UUID | None = None


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


class MatchRespond(BaseModel):
    accept: bool


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_user_id: uuid.UUID
    body: str
    created_at: datetime


class SyncStart(BaseModel):
    target: int = Field(default=200, ge=10, le=2000)
    languages: list[str] | None = None
    label_groups: list[str] | None = None
    difficulty: str | None = Field(default=None, pattern="^(beginner|mid|hard)$")
    enrich_batch: int = Field(default=50, ge=0, le=300)


class SyncRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: str
    target: int
    indexed: int
    languages: list[str]
    label_groups: list[str] = []
    difficulty: str = ""
    error: str
    created_at: datetime
    updated_at: datetime


class TokenUpdate(BaseModel):
    token: str = Field(min_length=1, max_length=500)


class TokenStatus(BaseModel):
    configured: bool
    login: str = ""
    rate_limit: int = 0
    rate_remaining: int = 0


class StatusRead(BaseModel):
    project_count: int
    issue_count: int
    needs_onboarding: bool
    seeded: bool

class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    type: str
    title: str
    body: str
    link: str
    read: bool
    created_at: datetime

class ContributionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    repo: str
    issue_number: int
    state: str
    pr_url: str | None
    created_at: datetime

class ContributionClaim(BaseModel):
    repo: str = Field(min_length=1, max_length=200)
    issue_number: int = Field(default=0, ge=0)
    issue_id: uuid.UUID | None = None

class ContributionUpdate(BaseModel):
    state: str = Field(pattern="^(INTERESTED|CLAIMED|PR_OPEN|MERGED)$")
    pr_url: str | None = None
