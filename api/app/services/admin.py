from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from asyncpg.exceptions import UndefinedTableError
from sqlalchemy import Select, delete, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.admin import (
    BillingSubscription,
    BrandingProfile,
    Invoice,
    Organization,
    PlanCatalog,
    Tenant,
    TenantQuotaUsage,
)


def is_missing_admin_schema(error: Exception) -> bool:
    if isinstance(error, UndefinedTableError):
        return True
    orig = getattr(error, "orig", None)
    if isinstance(orig, UndefinedTableError):
        return True
    return False


async def list_plans(session: AsyncSession) -> List[PlanCatalog]:
    try:
        result = await session.scalars(
            select(PlanCatalog).order_by(PlanCatalog.price_cents.asc())
        )
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            return []
        raise
    return result.all()


async def list_organizations(session: AsyncSession) -> List[Organization]:
    try:
        result = await session.scalars(select(Organization).order_by(Organization.created_at.asc()))
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            return []
        raise
    return result.all()


async def _generate_unique_slug(session: AsyncSession, base_slug: str) -> str:
    slug = base_slug
    index = 2
    while True:
        stmt = select(Organization).where(Organization.slug == slug).limit(1)
        try:
            existing = await session.scalar(stmt)
        except (SQLAlchemyError, UndefinedTableError) as exc:
            if is_missing_admin_schema(exc):
                return slug
            raise
        if not existing:
            return slug
        slug = f"{base_slug}-{index}"
        index += 1


def _slugify(value: str) -> str:
    candidate = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    candidate = re.sub(r"-+", "-", candidate).strip("-")
    return candidate or uuid4().hex


async def create_organization(session: AsyncSession, payload: dict) -> Organization:
    provided_slug = payload.get("slug")
    base_slug = _slugify(provided_slug) if provided_slug else _slugify(payload.get("name", ""))
    slug = await _generate_unique_slug(session, base_slug)
    organization = Organization(
        name=payload.get("name"),
        slug=slug,
        plan=payload.get("plan", "free"),
        locale=payload.get("locale", "pt-BR"),
        timezone=payload.get("timezone", "America/Sao_Paulo"),
        max_users=payload.get("max_users"),
        max_projects=payload.get("max_projects"),
        max_storage_mb=payload.get("max_storage_mb"),
        settings=payload.get("settings") or {},
    )
    session.add(organization)
    await session.commit()
    await session.refresh(organization)
    return organization


async def get_organization(session: AsyncSession, organization_id: UUID) -> Organization:
    organization = await session.get(Organization, organization_id)
    if not organization:
        raise NoResultFound("Organization not found")
    return organization


async def update_organization(session: AsyncSession, organization_id: UUID, payload: dict) -> Organization:
    organization = await get_organization(session, organization_id)

    if payload.get("slug"):
        new_slug = _slugify(payload["slug"])
        if new_slug != organization.slug:
            organization.slug = await _generate_unique_slug(session, new_slug)

    for field in ("name", "plan", "locale", "timezone", "max_users", "max_projects", "max_storage_mb"):
        if field in payload and payload[field] is not None:
            setattr(organization, field, payload[field])

    if "settings" in payload and payload["settings"] is not None:
        organization.settings = payload["settings"]

    organization.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(organization)
    return organization


async def list_tenants_by_organization(
    session: AsyncSession, organization_id: UUID
) -> List[Tenant]:
    stmt = (
        select(Tenant)
        .where(Tenant.organization_id == organization_id)
        .order_by(Tenant.created_at.asc())
    )
    try:
        result = await session.scalars(stmt)
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            return []
        raise
    return result.all()


async def get_plan(session: AsyncSession, plan_id: UUID) -> PlanCatalog:
    plan = await session.get(PlanCatalog, plan_id)
    if not plan:
        raise NoResultFound("Plan not found")
    return plan


async def create_plan(session: AsyncSession, payload: dict) -> PlanCatalog:
    plan = PlanCatalog(**payload)
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return plan


async def update_plan(session: AsyncSession, plan_id: UUID, payload: dict) -> PlanCatalog:
    plan = await get_plan(session, plan_id)
    for key, value in payload.items():
        if value is not None:
            setattr(plan, key, value)
    plan.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(plan)
    return plan


async def delete_plan(session: AsyncSession, plan_id: UUID) -> None:
    await session.execute(delete(PlanCatalog).where(PlanCatalog.id == plan_id))
    await session.commit()


async def assign_subscription(
    session: AsyncSession,
    organization_id: UUID,
    payload: dict,
) -> BillingSubscription:
    plan_id: UUID = payload.get('plan_id')
    if not plan_id or not await session.get(PlanCatalog, plan_id):
        raise NoResultFound('Plan not found')

    active_stmt: Select = (
        select(BillingSubscription)
        .where(
            BillingSubscription.organization_id == organization_id,
            BillingSubscription.status.in_(["trialing", "active", "past_due"]),
        )
        .order_by(BillingSubscription.created_at.desc())
        .limit(1)
        .options(selectinload(BillingSubscription.plan))
    )
    result = await session.scalars(active_stmt)
    subscription = result.first()

    if subscription:
        for key, value in payload.items():
            setattr(subscription, key, value)
        subscription.updated_at = datetime.now(timezone.utc)
    else:
        subscription = BillingSubscription(
            organization_id=organization_id,
            **payload,
        )
        session.add(subscription)

    await session.commit()
    await session.refresh(subscription)
    if subscription.plan_id:
        await session.refresh(subscription, attribute_names=['plan'])
    return subscription


async def get_active_subscription(
    session: AsyncSession, organization_id: UUID
) -> Optional[BillingSubscription]:
    stmt = (
        select(BillingSubscription)
        .where(
            BillingSubscription.organization_id == organization_id,
            BillingSubscription.status.in_("trialing", "active", "past_due"),
        )
        .order_by(BillingSubscription.created_at.desc())
        .limit(1)
        .options(selectinload(BillingSubscription.plan))
    )
    result = await session.scalars(stmt)
    return result.first()


async def update_branding(
    session: AsyncSession, organization_id: UUID, payload: dict
) -> BrandingProfile:
    branding = await session.get(BrandingProfile, organization_id)
    if branding:
        for key, value in payload.items():
            setattr(branding, key, value)
        branding.updated_at = datetime.now(timezone.utc)
    else:
        branding = BrandingProfile(organization_id=organization_id, **payload)
        session.add(branding)

    await session.commit()
    await session.refresh(branding)
    return branding


async def get_branding(
    session: AsyncSession, organization_id: UUID
) -> Optional[BrandingProfile]:
    return await session.get(BrandingProfile, organization_id)


async def list_invoices(
    session: AsyncSession, organization_id: UUID, limit: int = 12
) -> List[Invoice]:
    try:
        result = await session.scalars(
            select(Invoice)
            .where(Invoice.organization_id == organization_id)
            .order_by(Invoice.issued_at.desc())
            .limit(limit)
        )
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            return []
        raise
    return result.all()


async def list_quota_usage_for_org(
    session: AsyncSession, organization_id: UUID
) -> List[TenantQuotaUsage]:
    stmt = (
        select(TenantQuotaUsage)
        .join(Tenant, TenantQuotaUsage.tenant_id == Tenant.id)
        .where(Tenant.organization_id == organization_id)
        .order_by(TenantQuotaUsage.metric.asc(), TenantQuotaUsage.period_start.desc())
        .options(selectinload(TenantQuotaUsage.tenant))
    )
    try:
        result = await session.scalars(stmt)
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            return []
        raise
    return result.all()


async def upsert_quota_usage(
    session: AsyncSession,
    tenant_id: UUID,
    payload: dict,
) -> TenantQuotaUsage:
    stmt = (
        select(TenantQuotaUsage)
        .where(
            TenantQuotaUsage.tenant_id == tenant_id,
            TenantQuotaUsage.metric == payload["metric"],
            TenantQuotaUsage.period_start == payload["period_start"],
        )
        .limit(1)
    )
    result = await session.scalars(stmt)
    quota = result.first()

    if quota:
        for key, value in payload.items():
            setattr(quota, key, value)
        quota.updated_at = datetime.now(timezone.utc)
    else:
        quota = TenantQuotaUsage(tenant_id=tenant_id, **payload)
        session.add(quota)

    await session.commit()
    await session.refresh(quota)
    return quota


async def get_organization_summary(
    session: AsyncSession, organization_id: UUID
):
    try:
        organization = await session.get(Organization, organization_id)
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            raise NoResultFound("Organization not found") from exc
        raise
    if not organization:
        raise NoResultFound("Organization not found")

    try:
        subscription = await get_active_subscription(session, organization_id)
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            subscription = None
        else:
            raise
    plan: Optional[PlanCatalog] = None
    if subscription:
        plan = subscription.plan
    else:
        plan_key = organization.plan
        try:
            result = await session.scalars(select(PlanCatalog).where(PlanCatalog.key == plan_key))
            plan = result.first()
        except (SQLAlchemyError, UndefinedTableError) as exc:
            if is_missing_admin_schema(exc):
                plan = None
            else:
                raise

    try:
        branding = await get_branding(session, organization_id)
    except (SQLAlchemyError, UndefinedTableError) as exc:
        if is_missing_admin_schema(exc):
            branding = None
        else:
            raise
    quotas = await list_quota_usage_for_org(session, organization_id)
    invoices = await list_invoices(session, organization_id)
    tenants = await list_tenants_by_organization(session, organization_id)

    return organization, plan, subscription, branding, quotas, invoices, tenants


async def list_quota_usage_by_tenant(
    session: AsyncSession, tenant_id: UUID
) -> List[TenantQuotaUsage]:
    result = await session.scalars(
        select(TenantQuotaUsage)
        .where(TenantQuotaUsage.tenant_id == tenant_id)
        .order_by(TenantQuotaUsage.period_start.desc())
        .options(selectinload(TenantQuotaUsage.tenant))
    )
    return result.all()
