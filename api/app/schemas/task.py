from __future__ import annotations

from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TaskSummary(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    status: str
    priority: str
    estimate_hours: Optional[int] = None
    story_points: Optional[float] = None
    due_date: Optional[date] = None
    assignee_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class TaskOut(TaskSummary):
    description: Optional[str] = None
    actual_hours: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
