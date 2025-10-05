from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MeetingParticipantIn(BaseModel):
    display_name: str
    email: Optional[str] = None
    role: Optional[str] = None


class MeetingParticipantOut(MeetingParticipantIn):
    user_id: Optional[UUID] = None
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None


class MeetingTypeInfo(BaseModel):
    id: UUID
    key: str
    name: str
    description: Optional[str] = None


class MeetingCreate(BaseModel):
    account_id: UUID
    meeting_type_id: UUID
    project_id: Optional[UUID] = None

    title: str
    occurred_at: datetime
    duration_minutes: Optional[int] = None
    transcript_language: Optional[str] = None
    sentiment_score: Optional[float] = None
    source: str = Field(default="manual")
    status: str = Field(default="processed")
    notes: Optional[str] = Field(default=None)
    participants: List[MeetingParticipantIn] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class MeetingUpdate(BaseModel):
    account_id: UUID
    meeting_type_id: Optional[UUID] = None
    project_id: Optional[UUID] = None

    title: Optional[str] = None
    occurred_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    transcript_language: Optional[str] = None
    sentiment_score: Optional[float] = None
    source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    participants: Optional[List[MeetingParticipantIn]] = None
    metadata: Optional[dict] = None


class MeetingOut(BaseModel):
    id: UUID
    account_id: UUID
    meeting_type: MeetingTypeInfo
    project_id: Optional[UUID]

    title: str
    occurred_at: datetime
    duration_minutes: Optional[int]
    transcript_language: Optional[str]
    sentiment_score: Optional[float]
    source: str
    status: str
    metadata: dict
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    participants: List[MeetingParticipantOut] = []
    chunk_count: int = 0

    @field_validator("sentiment_score", mode="before")
    @classmethod
    def cast_decimal(cls, value):  # noqa: D417 - simple normalization helper
        if isinstance(value, Decimal):
            return float(value)
        return value

    model_config = ConfigDict(from_attributes=True)
