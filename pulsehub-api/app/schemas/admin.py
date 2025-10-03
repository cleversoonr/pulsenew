from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PlanBase(BaseModel):
    key: str = Field(..., max_length=64)
    name: str
    description: Optional[str] = None
    price_cents: int = 0
    currency: str = "BRL"
    billing_period: str = "monthly"
    features: Dict[str, Any] = Field(default_factory=dict)
    limits: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    currency: Optional[str] = None
    billing_period: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    limits: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PlanOut(PlanBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BrandingUpdate(BaseModel):
    primary_color: Optional[str] = Field(default=None, max_length=16)
    secondary_color: Optional[str] = Field(default=None, max_length=16)
    accent_color: Optional[str] = Field(default=None, max_length=16)
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    custom_domain: Optional[str] = None
    login_message: Optional[str] = None


class BrandingOut(BrandingUpdate):
    updated_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubscriptionAssign(BaseModel):
    plan_id: UUID
    status: Optional[str] = Field(default="active")
    current_period_start: datetime
    current_period_end: datetime
    trial_ends_at: Optional[datetime] = None
    payment_method: Dict[str, Any] = Field(default_factory=dict)
    external_reference: Optional[str] = None


class SubscriptionOut(BaseModel):
    id: UUID
    organization_id: UUID
    plan_id: UUID
    status: str
    current_period_start: datetime
    current_period_end: datetime
    trial_ends_at: Optional[datetime]
    cancel_at: Optional[datetime]
    canceled_at: Optional[datetime]
    payment_method: Dict[str, Any]
    external_reference: Optional[str]
    created_at: datetime
    updated_at: datetime
    plan: PlanOut

    model_config = ConfigDict(from_attributes=True)


class InvoiceOut(BaseModel):
    id: UUID
    subscription_id: UUID
    organization_id: UUID
    issued_at: datetime
    due_at: Optional[datetime]
    status: str
    amount_cents: int
    currency: str
    line_items: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    external_reference: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class QuotaUsageIn(BaseModel):
    metric: str
    period_start: date
    period_end: date
    limit_value: Optional[float] = None
    used_value: float


class QuotaUsageOut(BaseModel):
    id: UUID
    tenant_id: UUID
    metric: str
    period_start: date
    period_end: date
    limit_value: Optional[float]
    used_value: float
    last_reset_at: datetime
    updated_at: datetime

    @field_validator("limit_value", "used_value", mode="before")
    @classmethod
    def cast_decimal(cls, value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        return value

    model_config = ConfigDict(from_attributes=True)


class OrganizationSummary(BaseModel):
    organization_id: UUID
    plan: Optional[PlanOut]
    subscription: Optional[SubscriptionOut]
    branding: Optional[BrandingOut]
    quotas: List[QuotaUsageOut]
    invoices: List[InvoiceOut]


class Message(BaseModel):
    detail: str
