from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.admin import Account, Plan, Project, UserApp


def is_missing_admin_schema(exc: SQLAlchemyError) -> bool:
    """Check if exception is due to missing admin schema tables."""
    msg = str(exc).lower()
    return "does not exist" in msg or "relation" in msg


# ===== Plan CRUD =====


async def list_plans(session: AsyncSession) -> List[Plan]:
    stmt = select(Plan).order_by(Plan.created_at.desc())
    result = await session.scalars(stmt)
    return list(result.all())


async def create_plan(session: AsyncSession, payload: Dict[str, Any]) -> Plan:
    plan = Plan(**payload)
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return plan


async def update_plan(session: AsyncSession, plan_id: UUID, payload: Dict[str, Any]) -> Plan:
    stmt = select(Plan).where(Plan.id == plan_id)
    result = await session.scalars(stmt)
    plan = result.one()
    for key, value in payload.items():
        setattr(plan, key, value)
    await session.commit()
    await session.refresh(plan)
    return plan


async def delete_plan(session: AsyncSession, plan_id: UUID) -> None:
    stmt = delete(Plan).where(Plan.id == plan_id)
    await session.execute(stmt)
    await session.commit()


# ===== Account CRUD =====


async def list_accounts(session: AsyncSession) -> List[Account]:
    stmt = select(Account).order_by(Account.created_at.desc()).options(selectinload(Account.plan))
    result = await session.scalars(stmt)
    return list(result.all())


async def get_account(session: AsyncSession, account_id: UUID) -> Optional[Account]:
    stmt = select(Account).where(Account.id == account_id).options(selectinload(Account.plan))
    result = await session.scalars(stmt)
    return result.first()


async def create_account(session: AsyncSession, payload: Dict[str, Any]) -> Account:
    # Auto-generate slug if not provided
    if not payload.get("slug"):
        base_slug = slugify(payload["name"])
        slug = base_slug
        counter = 1
        while True:
            stmt = select(Account).where(Account.slug == slug)
            result = await session.scalars(stmt)
            if not result.first():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        payload["slug"] = slug

    account = Account(**payload)
    session.add(account)
    try:
        await session.commit()
        await session.refresh(account)
        # Load plan relationship
        await session.refresh(account, ["plan"])
    except IntegrityError as exc:
        await session.rollback()
        if "unique constraint" in str(exc).lower() and "slug" in str(exc).lower():
            raise ValueError(f"Slug '{payload['slug']}' já está em uso") from exc
        raise
    return account


async def update_account(session: AsyncSession, account_id: UUID, payload: Dict[str, Any]) -> Account:
    stmt = select(Account).where(Account.id == account_id).options(selectinload(Account.plan))
    result = await session.scalars(stmt)
    account = result.one()

    for key, value in payload.items():
        setattr(account, key, value)

    try:
        await session.commit()
        await session.refresh(account)
        await session.refresh(account, ["plan"])
    except IntegrityError as exc:
        await session.rollback()
        if "unique constraint" in str(exc).lower() and "slug" in str(exc).lower():
            raise ValueError(f"Slug '{payload.get('slug')}' já está em uso") from exc
        raise
    return account


async def delete_account(session: AsyncSession, account_id: UUID) -> None:
    stmt = delete(Account).where(Account.id == account_id)
    await session.execute(stmt)
    await session.commit()


# ===== Projects =====


async def list_projects(session: AsyncSession, account_id: UUID) -> List[Project]:
    stmt = select(Project).where(Project.account_id == account_id).order_by(Project.created_at.desc())
    result = await session.scalars(stmt)
    return list(result.all())


async def list_users(session: AsyncSession, account_id: UUID) -> List[UserApp]:
    stmt = select(UserApp).where(UserApp.account_id == account_id).order_by(UserApp.full_name.asc())
    result = await session.scalars(stmt)
    return list(result.all())
