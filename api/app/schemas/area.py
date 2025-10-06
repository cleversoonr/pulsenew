from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AreaBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100, description="Unique key for the area within the account")
    name: str = Field(..., min_length=1, max_length=200, description="Display name of the area")
    description: Optional[str] = Field(None, description="Optional description of the area")
    is_active: bool = Field(True, description="Whether the area is active")


class AreaCreate(AreaBase):
    """Schema for creating a new area"""
    pass


class AreaUpdate(BaseModel):
    """Schema for updating an existing area"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AreaResponse(AreaBase):
    """Schema for area responses"""
    id: UUID
    account_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
