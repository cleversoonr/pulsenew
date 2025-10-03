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


class MeetingCreate(BaseModel):
    organization_id: UUID
    tenant_id: UUID
    project_id: Optional[UUID] = None

    title: str
    meeting_type: str = Field(description="Enum: daily|refinement|alignment|retro|planning|sync|workshop|one_on_one")
    occurred_at: datetime
    duration_minutes: Optional[int] = None
    transcript_language: Optional[str] = None
    sentiment_score: Optional[float] = None
    source: str = Field(default="manual")
    notes: Optional[str] = Field(default=None, description="Texto livre para registrar notas/transcrição simplificada")
    participants: List[MeetingParticipantIn] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class MeetingOut(BaseModel):
    id: UUID
    organization_id: UUID
    tenant_id: UUID
    project_id: Optional[UUID]

    title: str
    meeting_type: str
    occurred_at: datetime
    duration_minutes: Optional[int]
    transcript_language: Optional[str]
    sentiment_score: Optional[float]
    source: str
    status: str
    metadata: dict
    created_at: datetime

    participants: List[MeetingParticipantOut] = []
    chunk_count: int = 0

    @field_validator("sentiment_score", mode="before")
    @classmethod
    def cast_decimal(cls, value):
        if isinstance(value, Decimal):
            return float(value)
        return value

    model_config = ConfigDict(from_attributes=True)
