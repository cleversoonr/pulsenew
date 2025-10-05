from __future__ import annotations

from typing import Dict, List, Optional
from uuid import UUID

from slugify import slugify
from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.meeting import Meeting, MeetingType


async def list_meeting_types(
    session: AsyncSession,
    account_id: UUID,
    include_inactive: bool = True,
) -> List[MeetingType]:
    stmt: Select[MeetingType] = (
        select(MeetingType)
        .where(MeetingType.account_id == account_id)
        .order_by(MeetingType.name.asc())
    )
    if not include_inactive:
        stmt = stmt.where(MeetingType.is_active.is_(True))
    result = await session.scalars(stmt)
    return list(result.all())


async def create_meeting_type(session: AsyncSession, payload: Dict) -> MeetingType:
    key = payload.get("key")
    if not key:
        payload["key"] = slugify(payload["name"], separator="_")
    meeting_type = MeetingType(**payload)
    session.add(meeting_type)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ValueError("Já existe um tipo com esse identificador para a conta") from exc
    await session.refresh(meeting_type)
    return meeting_type


async def update_meeting_type(
    session: AsyncSession,
    meeting_type_id: UUID,
    payload: Dict,
) -> MeetingType:
    stmt = select(MeetingType).where(MeetingType.id == meeting_type_id)
    meeting_type = await session.scalar(stmt)
    if not meeting_type:
        raise LookupError("Tipo de reunião não encontrado")

    for field, value in payload.items():
        if field == "key" and value:
            value = slugify(value, separator="_")
        setattr(meeting_type, field, value)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ValueError("Já existe um tipo com esse identificador para a conta") from exc
    await session.refresh(meeting_type)
    return meeting_type


async def delete_meeting_type(session: AsyncSession, meeting_type_id: UUID) -> None:
    stmt = select(MeetingType).where(MeetingType.id == meeting_type_id)
    meeting_type = await session.scalar(stmt)
    if not meeting_type:
        raise LookupError("Tipo de reunião não encontrado")

    usage_stmt = select(Meeting.id).where(Meeting.meeting_type_id == meeting_type_id).limit(1)
    in_use = await session.scalar(usage_stmt)
    if in_use:
        raise ValueError("Não é possível remover um tipo com reuniões vinculadas")

    await session.delete(meeting_type)
    await session.commit()
