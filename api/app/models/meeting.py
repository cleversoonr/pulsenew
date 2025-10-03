from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import ARRAY, JSON, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


meeting_type_enum = Enum(
    "daily",
    "refinement",
    "alignment",
    "retro",
    "planning",
    "sync",
    "workshop",
    "one_on_one",
    name="meeting_type",
)


class Meeting(Base):
    __tablename__ = "meeting"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE"))
    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenant.id", ondelete="CASCADE"))
    project_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="SET NULL"))

    title: Mapped[str] = mapped_column(String)
    meeting_type: Mapped[str] = mapped_column(meeting_type_enum)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    transcript_language: Mapped[Optional[str]] = mapped_column(String)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    source: Mapped[str] = mapped_column(String, default="manual")
    status: Mapped[str] = mapped_column(String, default="processed")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    participants: Mapped[List["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    chunks: Mapped[List["DocChunk"]] = relationship(back_populates="meeting", cascade="all, delete-orphan")


class MeetingParticipant(Base):
    __tablename__ = "meeting_participant"

    meeting_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("meeting.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("user_account.id", ondelete="SET NULL"))
    display_name: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String)
    role: Mapped[Optional[str]] = mapped_column(String)
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    meeting: Mapped[Meeting] = relationship(back_populates="participants")


class DocChunk(Base):
    __tablename__ = "doc_chunk"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    meeting_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("meeting.id", ondelete="CASCADE"))
    project_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="SET NULL"))
    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenant.id", ondelete="CASCADE"))

    source_type: Mapped[str] = mapped_column(String)
    source_id: Mapped[Optional[str]] = mapped_column(String)
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    token_count: Mapped[Optional[int]] = mapped_column(Integer)
    language: Mapped[Optional[str]] = mapped_column(String)
    start_time: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    end_time: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    participants: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String))
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    meeting: Mapped[Optional[Meeting]] = relationship(back_populates="chunks")
