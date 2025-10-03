from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.admin import (
    BrandingOut,
    BrandingUpdate,
    Message,
    OrganizationCreate,
    OrganizationOut,
    OrganizationSummary,
    OrganizationUpdate,
    PlanCreate,
    PlanOut,
    PlanUpdate,
    QuotaUsageIn,
    QuotaUsageOut,
    SubscriptionAssign,
    SubscriptionOut,
    TenantOut,
)
from ..services import admin as admin_service

SCHEMA_NOT_READY_MESSAGE = "Schema de administração não inicializada. Execute pulsehub-db-schema.sql no banco antes de usar o módulo."

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


@router.post("/organizations", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(payload: OrganizationCreate, session: AsyncSession = Depends(get_session)):
    try:
        organization = await admin_service.create_organization(session, payload.model_dump())
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return organization


@router.put("/organizations/{organization_id}", response_model=OrganizationOut)
async def update_organization(
    organization_id: UUID,
    payload: OrganizationUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        organization = await admin_service.update_organization(
            session,
            organization_id,
            payload.model_dump(exclude_unset=True),
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return organization


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
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return subscription


@router.get(
    "/organizations/{organization_id}/branding",
    response_model=BrandingOut,
)
async def get_branding(organization_id: UUID, session: AsyncSession = Depends(get_session)):
    try:
        branding = await admin_service.get_branding(session, organization_id)
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
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
    try:
        branding = await admin_service.update_branding(
            session,
            organization_id,
            payload.model_dump(exclude_unset=True),
        )
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return branding


@router.get(
    "/organizations/{organization_id}/summary",
    response_model=OrganizationSummary,
)
async def organization_summary(
    organization_id: UUID, session: AsyncSession = Depends(get_session)
):
    try:
        organization, plan, subscription, branding, quotas, invoices, tenants = await admin_service.get_organization_summary(
            session, organization_id
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise

    return OrganizationSummary(
        organization_id=organization.id,
        plan=plan,
        subscription=subscription,
        branding=branding,
        quotas=quotas,
        invoices=invoices,
        tenants=tenants,
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
    try:
        quota = await admin_service.upsert_quota_usage(
            session,
            tenant_id,
            payload.model_dump(),
        )
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return quota


@router.get("/organizations", response_model=List[OrganizationOut])
async def list_organizations(session: AsyncSession = Depends(get_session)):
    organizations = await admin_service.list_organizations(session)
    return organizations


@router.get("/organizations/{organization_id}/tenants", response_model=List[TenantOut])
async def list_tenants(
    organization_id: UUID, session: AsyncSession = Depends(get_session)
):
    tenants = await admin_service.list_tenants_by_organization(session, organization_id)
    return tenants
