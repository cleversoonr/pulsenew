from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .task import TaskSummary


class SprintTaskInput(BaseModel):
    task_id: UUID
    planned_hours: Optional[int] = None
    planned_points: Optional[float] = None
    status: str = Field(default="committed")
    notes: Optional[str] = None
    position: Optional[int] = None


class SprintCapacityInput(BaseModel):
    user_id: UUID
    week_start: date
    hours: int


class SprintBase(BaseModel):
    account_id: UUID
    project_id: UUID
    name: str
    goal: Optional[str] = None
    sprint_number: Optional[int] = None
    starts_at: date
    ends_at: date
    status: str = Field(default="planning")


class SprintCreate(SprintBase):
    tasks: List[SprintTaskInput] = Field(default_factory=list)
    capacities: List[SprintCapacityInput] = Field(default_factory=list)


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    sprint_number: Optional[int] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    status: Optional[str] = None
    tasks: Optional[List[SprintTaskInput]] = None
    capacities: Optional[List[SprintCapacityInput]] = None


class SprintTaskOut(SprintTaskInput):
    sprint_id: UUID
    account_id: UUID
    task: TaskSummary

    model_config = ConfigDict(from_attributes=True)


class SprintCapacityOut(SprintCapacityInput):
    id: UUID
    sprint_id: Optional[UUID] = None
    account_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SprintOut(SprintBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    tasks: List[SprintTaskOut] = Field(default_factory=list)
    capacities: List[SprintCapacityOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
