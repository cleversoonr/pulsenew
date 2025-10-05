from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import ARRAY, JSON, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:  # evita import circular
    from .admin import Project


class MeetingType(Base):
    __tablename__ = "meeting_type"
    __table_args__ = (UniqueConstraint("account_id", "key", name="uq_meeting_type_account_key"),)

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    account_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    meetings: Mapped[List["Meeting"]] = relationship(back_populates="meeting_type")


class Meeting(Base):
    __tablename__ = "meeting"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    account_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False
    )
    meeting_type_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("meeting_type.id", ondelete="RESTRICT"), nullable=False
    )
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="SET NULL")
    )

    title: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    transcript_language: Mapped[Optional[str]] = mapped_column(String)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    source: Mapped[str] = mapped_column(String, nullable=False, default="manual")
    status: Mapped[str] = mapped_column(String, nullable=False, default="processed")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    meeting_type: Mapped[MeetingType] = relationship(back_populates="meetings")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="meetings")
    participants: Mapped[List["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    chunks: Mapped[List["DocChunk"]] = relationship(back_populates="meeting", cascade="all, delete-orphan")


class MeetingParticipant(Base):
    __tablename__ = "meeting_participant"

    meeting_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("meeting.id", ondelete="CASCADE"), primary_key=True
    )
    display_name: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user_app.id", ondelete="SET NULL"), nullable=True
    )
    email: Mapped[Optional[str]] = mapped_column(String)
    role: Mapped[Optional[str]] = mapped_column(String)
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    meeting: Mapped[Meeting] = relationship(back_populates="participants")


class DocChunk(Base):
    __tablename__ = "doc_chunk"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    meeting_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("meeting.id", ondelete="CASCADE")
    )
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="SET NULL")
    )
    account_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    source_id: Mapped[Optional[str]] = mapped_column(String)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[Optional[int]] = mapped_column(Integer)
    language: Mapped[Optional[str]] = mapped_column(String)
    start_time: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    end_time: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    participants: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String))
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    meeting: Mapped[Optional[Meeting]] = relationship(back_populates="chunks")
