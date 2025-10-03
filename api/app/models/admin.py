from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


plan_tier_enum = Enum(
    "free",
    "pro",
    "enterprise",
    name="plan_tier",
)

subscription_status_enum = Enum(
    "trialing",
    "active",
    "past_due",
    "canceled",
    name="subscription_status",
)

invoice_status_enum = Enum(
    "draft",
    "open",
    "paid",
    "void",
    "uncollectible",
    name="invoice_status",
)


class PlanCatalog(Base):
    __tablename__ = "plan_catalog"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[Optional[str]] = mapped_column(Text())
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="BRL")
    billing_period: Mapped[str] = mapped_column(String(32), default="monthly")
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    limits: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=func.now(),
    )

    subscriptions: Mapped[List["BillingSubscription"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True)
    plan: Mapped[str] = mapped_column(plan_tier_enum, default="free")
    locale: Mapped[str] = mapped_column(String, default="pt-BR")
    timezone: Mapped[str] = mapped_column(String, default="America/Sao_Paulo")
    max_users: Mapped[Optional[int]] = mapped_column(Integer)
    max_projects: Mapped[Optional[int]] = mapped_column(Integer)
    max_storage_mb: Mapped[Optional[int]] = mapped_column(Integer)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=func.now(),
    )

    subscriptions: Mapped[List["BillingSubscription"]] = relationship(
        back_populates="organization"
    )
    branding: Mapped[Optional["BrandingProfile"]] = relationship(
        back_populates="organization",
        uselist=False,
        cascade="all, delete-orphan",
    )
    invoices: Mapped[List["Invoice"]] = relationship(back_populates="organization")
    tenants: Mapped[List["Tenant"]] = relationship(back_populates="organization")


class Tenant(Base):
    __tablename__ = "tenant"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)
    region: Mapped[Optional[str]] = mapped_column(String)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=func.now(),
    )

    organization: Mapped[Organization] = relationship(back_populates="tenants")
    quotas: Mapped[List["TenantQuotaUsage"]] = relationship(back_populates="tenant")


class BillingSubscription(Base):
    __tablename__ = "billing_subscription"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    organization_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE")
    )
    plan_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("plan_catalog.id", ondelete="RESTRICT")
    )
    status: Mapped[str] = mapped_column(subscription_status_enum, default="trialing")
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancel_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    canceled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    payment_method: Mapped[dict] = mapped_column(JSON, default=dict)
    external_reference: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=func.now(),
    )

    organization: Mapped[Organization] = relationship(back_populates="subscriptions")
    plan: Mapped[PlanCatalog] = relationship(back_populates="subscriptions")
    invoices: Mapped[List["Invoice"]] = relationship(back_populates="subscription")


class Invoice(Base):
    __tablename__ = "invoice"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    subscription_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("billing_subscription.id", ondelete="CASCADE")
    )
    organization_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organization.id", ondelete="CASCADE")
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(invoice_status_enum, default="draft")
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="BRL")
    line_items: Mapped[list] = mapped_column(JSON, default=list)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    external_reference: Mapped[Optional[str]] = mapped_column(String)

    subscription: Mapped[BillingSubscription] = relationship(back_populates="invoices")
    organization: Mapped[Organization] = relationship(back_populates="invoices")


class TenantQuotaUsage(Base):
    __tablename__ = "tenant_quota_usage"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tenant.id", ondelete="CASCADE")
    )
    metric: Mapped[str] = mapped_column(String(64))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    limit_value: Mapped[Optional[float]] = mapped_column(Numeric)
    used_value: Mapped[float] = mapped_column(Numeric, default=0)
    last_reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=func.now(),
    )

    tenant: Mapped[Tenant] = relationship(back_populates="quotas")


class BrandingProfile(Base):
    __tablename__ = "branding_profile"

    organization_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organization.id", ondelete="CASCADE"),
        primary_key=True,
    )
    primary_color: Mapped[Optional[str]] = mapped_column(String(16))
    secondary_color: Mapped[Optional[str]] = mapped_column(String(16))
    accent_color: Mapped[Optional[str]] = mapped_column(String(16))
    logo_url: Mapped[Optional[str]] = mapped_column(Text())
    favicon_url: Mapped[Optional[str]] = mapped_column(Text())
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255))
    login_message: Mapped[Optional[str]] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=func.now(),
    )

    organization: Mapped[Organization] = relationship(back_populates="branding")
