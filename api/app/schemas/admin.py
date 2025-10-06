from __future__ import annotations

from datetime import datetime, date
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PlanBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    price_cents: int = 0
    currency: str = "BRL"
    billing_period: str = "monthly"
    features: Dict[str, Any] = Field(default_factory=dict)
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
    is_active: Optional[bool] = None


class PlanOut(PlanBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccountBase(BaseModel):
    name: str
    slug: Optional[str] = None
    plan_id: Optional[UUID] = None
    locale: str = "pt-BR"
    timezone: str = "America/Sao_Paulo"
    settings: Dict[str, Any] = Field(default_factory=dict)


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    plan_id: Optional[UUID] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class AccountOut(AccountBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    plan: Optional[PlanOut] = None

    @field_validator("settings", mode="before")
    @classmethod
    def default_settings(cls, value: Any) -> Dict[str, Any]:
        return value or {}

    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    detail: str


class ProjectBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    status: str = Field(default="active")
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    key: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectOut(ProjectBase):
    id: UUID
    account_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserOut(BaseModel):
    id: UUID
    account_id: UUID
    area_id: Optional[UUID] = None
    email: str
    full_name: str
    picture_url: Optional[str] = None
    locale: str
    timezone: Optional[str] = None
    phone: Optional[str] = None
    is_root: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    area_id: Optional[UUID] = None
    picture_url: Optional[str] = None
    locale: str = "pt-BR"
    timezone: Optional[str] = None
    phone: Optional[str] = None
    is_root: Optional[bool] = False
    password: Optional[str] = Field(default=None, min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    area_id: Optional[UUID] = None
    picture_url: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    phone: Optional[str] = None
    is_root: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)
