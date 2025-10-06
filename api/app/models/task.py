from __future__ import annotations

from datetime import datetime, date
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:  # evita import circular
    from .admin import Account, Project, UserApp
    from .sprint import SprintTask


class TaskType(Base):
    __tablename__ = "task_type"
    __table_args__ = (UniqueConstraint("account_id", "key", name="uq_task_type_account_key"),)

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    account_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("account.id", ondelete="CASCADE"),
        nullable=False,
    )
    key: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    workflow: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb"))

    account: Mapped["Account"] = relationship("Account")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="task_type")

class Task(Base):
    __tablename__ = "task"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("task.id", ondelete="SET NULL"))
    task_type_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("task_type.id", ondelete="SET NULL"),
    )
    external_ref: Mapped[Optional[str]] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, nullable=False, default="backlog")
    priority: Mapped[str] = mapped_column(String, nullable=False, default="medium")
    estimate_hours: Mapped[Optional[int]] = mapped_column(Integer)
    actual_hours: Mapped[Optional[int]] = mapped_column(Integer)
    story_points: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    assignee_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("user_app.id", ondelete="SET NULL"))
    created_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("user_app.id", ondelete="SET NULL"))
    updated_by: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("user_app.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    assignee: Mapped[Optional["UserApp"]] = relationship("UserApp", foreign_keys=[assignee_id])
    sprint_assignments: Mapped[List["SprintTask"]] = relationship(
        "SprintTask", back_populates="task", cascade="all, delete-orphan"
    )
    task_type: Mapped[Optional["TaskType"]] = relationship("TaskType", back_populates="tasks")

    children: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="parent",
        remote_side="Task.id",
        cascade="all, delete-orphan",
        single_parent=True,
    )
    parent: Mapped[Optional["Task"]] = relationship("Task", back_populates="children", uselist=False)
