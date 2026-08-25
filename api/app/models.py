import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


def new_id() -> uuid.UUID:
    return uuid.uuid4()


class ExperienceLevel(str, enum.Enum):
    NEWCOMER = "NEWCOMER"
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"


class SwipeDirection(str, enum.Enum):
    LIKE = "LIKE"
    PASS = "PASS"
    SUPER_LIKE = "SUPER_LIKE"


class MatchStatus(str, enum.Enum):
    PENDING_PROJECT = "PENDING_PROJECT"
    MATCHED = "MATCHED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
    CLOSED = "CLOSED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    github_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    github_login: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    bio: Mapped[str | None] = mapped_column(Text)
    experience_level: Mapped[ExperienceLevel] = mapped_column(
        Enum(ExperienceLevel, name="experience_level"), default=ExperienceLevel.NEWCOMER
    )
    experience_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    tech_stack: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    domains: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    availability: Mapped[dict] = mapped_column(JSONB, default=dict)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    swipes: Mapped[list["Swipe"]] = relationship(back_populates="user")
    matches: Mapped[list["Match"]] = relationship(back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    repo_url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    github_repo_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    owner_login: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    languages: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    topics: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    license_spdx: Mapped[str | None] = mapped_column(String(80))
    stars: Mapped[int] = mapped_column(Integer, default=0)
    forks: Mapped[int] = mapped_column(Integer, default=0)
    issue_count: Mapped[int] = mapped_column(Integer, default=0)
    contributor_count: Mapped[int] = mapped_column(Integer, default=0)
    activity_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    difficulty_level: Mapped[float] = mapped_column(Numeric(4, 2), default=2.5)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    swipes: Mapped[list["Swipe"]] = relationship(back_populates="project")
    matches: Mapped[list["Match"]] = relationship(back_populates="project")


class Swipe(Base):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project_swipe"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    direction: Mapped[SwipeDirection] = mapped_column(Enum(SwipeDirection, name="swipe_direction"), nullable=False)
    score_at_swipe: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    score_features: Mapped[dict] = mapped_column(JSONB, default=dict)
    client_request_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="swipes")
    project: Mapped[Project] = relationship(back_populates="swipes")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_match_user_project"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus, name="match_status"), default=MatchStatus.PENDING_PROJECT)
    compatibility_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    score_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)
    initiated_by: Mapped[str] = mapped_column(String(20), default="DEVELOPER")
    matched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="matches")
    project: Mapped[Project] = relationship(back_populates="matches")
    conversation: Mapped["Conversation | None"] = relationship(back_populates="match", uselist=False)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    match_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("matches.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    match: Mapped[Match] = relationship(back_populates="conversation")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    redacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class IssueRecommendation(Base):
    __tablename__ = "issue_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_id)
    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    issue_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), default="rules-v1")
    features: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="SUGGESTED")
    stale_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
