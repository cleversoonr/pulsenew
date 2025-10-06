from __future__ import annotations

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

TASK_STATUS_ALLOWED = {"backlog", "planned", "in_progress", "review", "blocked", "done"}
TASK_PRIORITY_ALLOWED = {"low", "medium", "high", "critical"}


class TaskTypeBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    workflow: Dict[str, object] = Field(default_factory=dict)


class TaskTypeCreate(TaskTypeBase):
    pass


class TaskTypeUpdate(BaseModel):
    key: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    workflow: Optional[Dict[str, object]] = None


class TaskTypeOut(TaskTypeBase):
    id: UUID
    account_id: UUID

    model_config = ConfigDict(from_attributes=True)


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

    @field_validator("story_points", mode="before")
    @classmethod
    def convert_story_points(cls, value: Optional[float]):
        if isinstance(value, Decimal):
            return float(value)
        return value


class TaskOut(TaskSummary):
    description: Optional[str] = None
    actual_hours: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    task_type_id: Optional[UUID] = None
    task_type: Optional[TaskTypeOut] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("actual_hours", mode="before")
    @classmethod
    def convert_actual_hours(cls, value):
        if isinstance(value, Decimal):
            return float(value)
        return value


class TaskCreate(BaseModel):
    account_id: UUID
    project_id: UUID
    title: str
    description: Optional[str] = None
    task_type_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    status: str = Field(default="backlog")
    priority: str = Field(default="medium")
    estimate_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    story_points: Optional[float] = None
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assignee_id: Optional[UUID] = None
    external_ref: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in TASK_STATUS_ALLOWED:
            raise ValueError("Status de tarefa inválido")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        if value not in TASK_PRIORITY_ALLOWED:
            raise ValueError("Prioridade inválida")
        return value


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    estimate_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    story_points: Optional[float] = None
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assignee_id: Optional[UUID] = None
    external_ref: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in TASK_STATUS_ALLOWED:
            raise ValueError("Status de tarefa inválido")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in TASK_PRIORITY_ALLOWED:
            raise ValueError("Prioridade inválida")
        return value
