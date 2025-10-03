from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.admin import (
    BrandingOut,
    BrandingUpdate,
    Message,
    OrganizationSummary,
    PlanCreate,
    PlanOut,
    PlanUpdate,
    QuotaUsageIn,
    QuotaUsageOut,
    SubscriptionAssign,
    SubscriptionOut,
)
from ..services import admin as admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/plans", response_model=List[PlanOut])
async def list_plans(session: AsyncSession = Depends(get_session)):
    plans = await admin_service.list_plans(session)
    return plans


@router.post("/plans", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(payload: PlanCreate, session: AsyncSession = Depends(get_session)):
    plan = await admin_service.create_plan(session, payload.model_dump())
    return plan


@router.put("/plans/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: UUID, payload: PlanUpdate, session: AsyncSession = Depends(get_session)):
    try:
        plan = await admin_service.update_plan(session, plan_id, payload.model_dump(exclude_unset=True))
    except NoResultFound as exc:  # pragma: no cover - we surface via HTTP
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return plan


@router.delete("/plans/{plan_id}", response_model=Message, status_code=status.HTTP_200_OK)
async def delete_plan(plan_id: UUID, session: AsyncSession = Depends(get_session)):
    await admin_service.delete_plan(session, plan_id)
    return Message(detail="Plan removed")


@router.post(
    "/organizations/{organization_id}/subscription",
    response_model=SubscriptionOut,
)
async def assign_subscription(
    organization_id: UUID,
    payload: SubscriptionAssign,
    session: AsyncSession = Depends(get_session),
):
    try:
        subscription = await admin_service.assign_subscription(
            session,
            organization_id,
            payload.model_dump(),
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return subscription


@router.get(
    "/organizations/{organization_id}/branding",
    response_model=BrandingOut,
)
async def get_branding(organization_id: UUID, session: AsyncSession = Depends(get_session)):
    branding = await admin_service.get_branding(session, organization_id)
    if not branding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branding profile not found")
    return branding


@router.put(
    "/organizations/{organization_id}/branding",
    response_model=BrandingOut,
)
async def upsert_branding(
    organization_id: UUID,
    payload: BrandingUpdate,
    session: AsyncSession = Depends(get_session),
):
    branding = await admin_service.update_branding(
        session,
        organization_id,
        payload.model_dump(exclude_unset=True),
    )
    return branding


@router.get(
    "/organizations/{organization_id}/summary",
    response_model=OrganizationSummary,
)
async def organization_summary(
    organization_id: UUID, session: AsyncSession = Depends(get_session)
):
    try:
        organization, plan, subscription, branding, quotas, invoices = await admin_service.get_organization_summary(
            session, organization_id
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return OrganizationSummary(
        organization_id=organization.id,
        plan=plan,
        subscription=subscription,
        branding=branding,
        quotas=quotas,
        invoices=invoices,
    )


@router.get("/tenants/{tenant_id}/quotas", response_model=List[QuotaUsageOut])
async def list_quota_usage(tenant_id: UUID, session: AsyncSession = Depends(get_session)):
    quotas = await admin_service.list_quota_usage_by_tenant(session, tenant_id)
    return quotas


@router.post(
    "/tenants/{tenant_id}/quotas",
    response_model=QuotaUsageOut,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_quota_usage(
    tenant_id: UUID,
    payload: QuotaUsageIn,
    session: AsyncSession = Depends(get_session),
):
    quota = await admin_service.upsert_quota_usage(
        session,
        tenant_id,
        payload.model_dump(),
    )
    return quota
