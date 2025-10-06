from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MeetingTypeBase(BaseModel):
    account_id: UUID
    name: str
    key: Optional[str] = Field(default=None, description="Identificador único por conta")
    description: Optional[str] = None
    prompt: Optional[str] = Field(default=None, description="Prompt para IA processar a reunião")
    is_active: bool = True


class MeetingTypeCreate(MeetingTypeBase):
    pass


class MeetingTypeUpdate(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    is_active: Optional[bool] = None


class MeetingTypeOut(BaseModel):
    id: UUID
    account_id: UUID
    key: str
    name: str
    description: Optional[str]
    prompt: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
