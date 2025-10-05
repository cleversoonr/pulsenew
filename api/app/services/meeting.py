from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Select, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.meeting import DocChunk, Meeting, MeetingParticipant, MeetingType


async def list_meetings(
    session: AsyncSession,
    account_id: UUID,
    meeting_type_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Meeting]:
    stmt = (
        select(Meeting)
        .where(Meeting.account_id == account_id)
        .order_by(Meeting.occurred_at.desc())
        .limit(limit)
        .offset(offset)
        .options(
            selectinload(Meeting.meeting_type),
            selectinload(Meeting.participants),
        )
    )
    if meeting_type_id is not None:
        stmt = stmt.where(Meeting.meeting_type_id == meeting_type_id)
    if project_id is not None:
        stmt = stmt.where(Meeting.project_id == project_id)
    result = await session.scalars(stmt)
    return list(result.all())


async def get_meeting(session: AsyncSession, meeting_id: UUID) -> Meeting:
    stmt: Select[Meeting] = (
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.meeting_type),
            selectinload(Meeting.participants),
        )
    )
    result = await session.scalars(stmt)
    meeting = result.first()
    if not meeting:
        raise LookupError("Meeting not found")
    return meeting


async def create_meeting(session: AsyncSession, payload: dict) -> Meeting:
    participants = payload.pop("participants", [])
    notes: Optional[str] = payload.pop("notes", None)
    metadata = payload.pop("metadata", {})

    meeting_type_id = payload["meeting_type_id"]
    account_id = payload["account_id"]

    mt_stmt = select(MeetingType).where(
        MeetingType.id == meeting_type_id,
        MeetingType.account_id == account_id,
        MeetingType.is_active.is_(True),
    )
    meeting_type = await session.scalar(mt_stmt)
    if not meeting_type:
        raise ValueError("Tipo de reunião inválido para esta conta")

    meeting = Meeting(**payload)
    meeting.metadata_json = metadata or {}
    meeting.notes = notes
    session.add(meeting)
    await session.flush()

    for participant in participants or []:
        mp = MeetingParticipant(
            meeting_id=meeting.id,
            display_name=participant.get("display_name"),
            email=participant.get("email"),
            role=participant.get("role"),
        )
        session.add(mp)

    if notes:
        chunk = DocChunk(
            meeting_id=meeting.id,
            project_id=meeting.project_id,
            account_id=meeting.account_id,
            source_type="meeting_notes",
            source_id=None,
            chunk_index=0,
            content=notes,
            language=payload.get("transcript_language") or meeting.transcript_language,
        )
        session.add(chunk)

    await session.commit()
    await session.refresh(meeting)
    await session.refresh(meeting, attribute_names=["meeting_type", "participants"])
    return meeting


async def count_chunks_for_meeting(session: AsyncSession, meeting_id: UUID) -> int:
    result = await session.execute(
        select(func.count()).select_from(DocChunk).where(DocChunk.meeting_id == meeting_id)
    )
    return int(result.scalar() or 0)


async def update_meeting(session: AsyncSession, meeting_id: UUID, payload: dict) -> Meeting:
    participants = payload.pop("participants", None)
    notes: Optional[str] = payload.pop("notes", None)
    metadata = payload.pop("metadata", None)
    account_id: UUID = payload["account_id"]

    stmt: Select[Meeting] = (
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.meeting_type),
            selectinload(Meeting.participants),
        )
    )
    meeting = await session.scalar(stmt)
    if not meeting:
        raise LookupError("Meeting not found")
    if meeting.account_id != account_id:
        raise ValueError("Conta inválida para atualizar a reunião")

    if "meeting_type_id" in payload:
        meeting_type_id = payload["meeting_type_id"]
        mt_stmt = select(MeetingType).where(
            MeetingType.id == meeting_type_id,
            MeetingType.account_id == account_id,
            MeetingType.is_active.is_(True),
        )
        meeting_type = await session.scalar(mt_stmt)
        if not meeting_type:
            raise ValueError("Tipo de reunião inválido para esta conta")

    for field, value in payload.items():
        setattr(meeting, field, value)

    if metadata is not None:
        meeting.metadata_json = metadata or {}

    if notes is not None:
        meeting.notes = notes
        await session.execute(
            delete(DocChunk).where(
                DocChunk.meeting_id == meeting.id,
                DocChunk.source_type == "meeting_notes",
            )
        )
        if notes:
            chunk = DocChunk(
                meeting_id=meeting.id,
                project_id=meeting.project_id,
                account_id=meeting.account_id,
                source_type="meeting_notes",
                source_id=None,
                chunk_index=0,
                content=notes,
                language=meeting.transcript_language,
            )
            session.add(chunk)

    if participants is not None:
        await session.execute(delete(MeetingParticipant).where(MeetingParticipant.meeting_id == meeting.id))
        for participant in participants:
            mp = MeetingParticipant(
                meeting_id=meeting.id,
                display_name=participant.get("display_name"),
                email=participant.get("email"),
                role=participant.get("role"),
            )
            session.add(mp)

    meeting.updated_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(meeting)
    await session.refresh(meeting, attribute_names=["meeting_type", "participants"])
    return meeting


async def delete_meeting(session: AsyncSession, meeting_id: UUID, account_id: UUID) -> None:
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    meeting = await session.scalar(stmt)
    if not meeting:
        raise LookupError("Meeting not found")
    if meeting.account_id != account_id:
        raise ValueError("Conta inválida para remover a reunião")

    await session.delete(meeting)
    await session.commit()
