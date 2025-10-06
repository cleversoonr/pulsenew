from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

import hashlib

from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.admin import Account, Plan, Project, UserApp

PROJECT_STATUS_ALLOWED = {"draft", "active", "on_hold", "completed", "archived"}


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


async def create_project(session: AsyncSession, account_id: UUID, payload: Dict[str, Any]) -> Project:
    status = (payload.get("status") or "active").strip()
    if status not in PROJECT_STATUS_ALLOWED:
        raise ValueError("Status de projeto inválido")

    project = Project(
        account_id=account_id,
        key=payload["key"],
        name=payload["name"],
        description=payload.get("description"),
        status=status,
        start_date=payload.get("start_date"),
        end_date=payload.get("end_date"),
    )
    session.add(project)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        lower_msg = str(exc).lower()
        if "uq_project_account_key" in lower_msg or ("unique" in lower_msg and "key" in lower_msg):
            raise ValueError("Já existe um projeto com essa chave nesta conta") from exc
        raise

    await session.refresh(project)
    return project


async def update_project(
    session: AsyncSession,
    account_id: UUID,
    project_id: UUID,
    payload: Dict[str, Any],
) -> Project:
    stmt = select(Project).where(Project.id == project_id, Project.account_id == account_id)
    result = await session.scalars(stmt)
    project = result.one()

    if "status" in payload and payload["status"] is not None:
        status = payload["status"].strip()
        if status not in PROJECT_STATUS_ALLOWED:
            raise ValueError("Status de projeto inválido")
        payload["status"] = status

    for key, value in payload.items():
        setattr(project, key, value)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        lower_msg = str(exc).lower()
        if "uq_project_account_key" in lower_msg or ("unique" in lower_msg and "key" in lower_msg):
            raise ValueError("Já existe um projeto com essa chave nesta conta") from exc
        raise

    await session.refresh(project)
    return project


async def delete_project(session: AsyncSession, account_id: UUID, project_id: UUID) -> None:
    stmt = select(Project).where(Project.id == project_id, Project.account_id == account_id)
    result = await session.scalars(stmt)
    project = result.first()
    if not project:
        raise NoResultFound

    await session.delete(project)
    await session.commit()


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


async def create_user(session: AsyncSession, account_id: UUID, payload: Dict[str, Any]) -> UserApp:
    data = payload.copy()
    password = data.pop("password", None)

    user = UserApp(
        account_id=account_id,
        email=data["email"],
        full_name=data["full_name"],
        area_id=data.get("area_id"),
        picture_url=data.get("picture_url"),
        locale=data.get("locale", "pt-BR"),
        timezone=data.get("timezone"),
        phone=data.get("phone"),
        is_root=data.get("is_root"),
    )

    if password:
        user.password_hash = _hash_password(password)

    session.add(user)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if "unique" in str(exc).lower() and "email" in str(exc).lower():
            raise ValueError("E-mail já está em uso") from exc
        raise

    await session.refresh(user)
    return user


async def update_user(
    session: AsyncSession,
    account_id: UUID,
    user_id: UUID,
    payload: Dict[str, Any],
) -> UserApp:
    stmt = select(UserApp).where(UserApp.id == user_id, UserApp.account_id == account_id)
    result = await session.scalars(stmt)
    user = result.one()

    data = payload.copy()
    password = data.pop("password", None)

    for key, value in data.items():
        setattr(user, key, value)

    if password:
        user.password_hash = _hash_password(password)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if "unique" in str(exc).lower() and "email" in str(exc).lower():
            raise ValueError("E-mail já está em uso") from exc
        raise

    await session.refresh(user)
    return user


async def delete_user(session: AsyncSession, account_id: UUID, user_id: UUID) -> None:
    stmt = select(UserApp).where(UserApp.id == user_id, UserApp.account_id == account_id)
    result = await session.scalars(stmt)
    user = result.first()
    if not user:
        raise NoResultFound

    await session.delete(user)
    await session.commit()
