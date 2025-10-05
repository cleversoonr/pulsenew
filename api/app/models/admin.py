from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import CITEXT, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:  # evita import circular em tempo de execução
    from .meeting import Meeting
    from .task import Task
    from .sprint import Sprint


class Plan(Base):
    __tablename__ = "plan"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="BRL")
    billing_period: Mapped[str] = mapped_column(Text, nullable=False, default="monthly")
    features: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    accounts: Mapped[List["Account"]] = relationship(back_populates="plan")


class Account(Base):
    __tablename__ = "account"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    plan_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("plan.id", ondelete="SET NULL"),
        nullable=True,
    )
    locale: Mapped[str] = mapped_column(Text, nullable=False, default="pt-BR")
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="America/Sao_Paulo")
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    plan: Mapped[Optional["Plan"]] = relationship(back_populates="accounts")
    users: Mapped[List["UserApp"]] = relationship(back_populates="account")
    projects: Mapped[List["Project"]] = relationship(back_populates="account")


class UserApp(Base):
    __tablename__ = "user_app"

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
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    picture_url: Mapped[Optional[str]] = mapped_column(Text)
    locale: Mapped[str] = mapped_column(Text, nullable=False, default="pt-BR")
    timezone: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    password_hash: Mapped[Optional[str]] = mapped_column(Text)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_root: Mapped[Optional[bool]] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    account: Mapped["Account"] = relationship(back_populates="users")


class Project(Base):
    __tablename__ = "project"
    __table_args__ = (UniqueConstraint("account_id", "key", name="uq_project_account_key"),)

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
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    start_date: Mapped[Optional[Date]] = mapped_column(Date)
    end_date: Mapped[Optional[Date]] = mapped_column(Date)
    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user_app.id", ondelete="SET NULL"),
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user_app.id", ondelete="SET NULL"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    account: Mapped["Account"] = relationship(back_populates="projects")
    creator: Mapped[Optional["UserApp"]] = relationship("UserApp", foreign_keys=[created_by])
    updater: Mapped[Optional["UserApp"]] = relationship("UserApp", foreign_keys=[updated_by])
    meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="project")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project")
    sprints: Mapped[List["Sprint"]] = relationship("Sprint", back_populates="project")
