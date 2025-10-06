from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:  # evita import circular
    from .admin import Account, Project, UserApp
    from .task import Task


class Sprint(Base):
    __tablename__ = "sprint"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="SET NULL"), nullable=True
    )
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(Text)
    sprint_number: Mapped[Optional[int]] = mapped_column(Integer)
    starts_at: Mapped[date] = mapped_column(Date, nullable=False)
    ends_at: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="planning")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="sprints")
    account: Mapped["Account"] = relationship("Account")
    assignments: Mapped[List["SprintTask"]] = relationship(
        "SprintTask", back_populates="sprint", cascade="all, delete-orphan"
    )
    capacities: Mapped[List["UserCapacity"]] = relationship(
        "UserCapacity", back_populates="sprint", cascade="all, delete-orphan"
    )


class SprintTask(Base):
    __tablename__ = "sprint_task"

    sprint_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("sprint.id", ondelete="CASCADE"), primary_key=True
    )
    task_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("task.id", ondelete="CASCADE"), primary_key=True
    )
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False)
    planned_hours: Mapped[Optional[int]] = mapped_column(Integer)
    planned_points: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    status: Mapped[str] = mapped_column(String, nullable=False, default="committed")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    position: Mapped[Optional[int]] = mapped_column(Integer)

    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="assignments")
    task: Mapped["Task"] = relationship("Task", back_populates="sprint_assignments")


class UserCapacity(Base):
    __tablename__ = "user_capacity"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("user_app.id", ondelete="CASCADE"), nullable=False)
    sprint_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("sprint.id", ondelete="SET NULL"))
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    sprint: Mapped[Optional["Sprint"]] = relationship("Sprint", back_populates="capacities")
    user: Mapped["UserApp"] = relationship("UserApp")


class HolidayCalendar(Base):
    __tablename__ = "holiday_calendar"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("account.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("project.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(String, nullable=False, default="global")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    account: Mapped["Account"] = relationship("Account")
    project: Mapped[Optional["Project"]] = relationship("Project")
