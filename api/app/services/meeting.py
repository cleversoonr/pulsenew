from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.meeting import DocChunk, Meeting, MeetingParticipant


async def list_meetings(
    session: AsyncSession,
    tenant_id: UUID,
    project_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Meeting]:
    stmt = (
        select(Meeting)
        .where(Meeting.tenant_id == tenant_id)
        .order_by(Meeting.occurred_at.desc())
        .limit(limit)
        .offset(offset)
        .options(selectinload(Meeting.participants))
    )
    if project_id is not None:
        stmt = stmt.where(Meeting.project_id == project_id)
    result = await session.scalars(stmt)
    return result.all()


async def get_meeting(session: AsyncSession, meeting_id: UUID) -> Meeting:
    stmt: Select = (
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(selectinload(Meeting.participants))
    )
    result = await session.scalars(stmt)
    meeting = result.first()
    if not meeting:
        raise LookupError("Meeting not found")
    return meeting


async def create_meeting(session: AsyncSession, payload: dict) -> Meeting:
    participants = payload.pop("participants", [])
    notes: Optional[str] = payload.pop("notes", None)
    meeting = Meeting(**payload)
    session.add(meeting)
    await session.flush()  # obtain meeting.id

    for p in participants or []:
        mp = MeetingParticipant(
            meeting_id=meeting.id,
            display_name=p.get("display_name"),
            email=p.get("email"),
            role=p.get("role"),
        )
        session.add(mp)

    if notes:
        chunk = DocChunk(
            meeting_id=meeting.id,
            project_id=meeting.project_id,
            tenant_id=meeting.tenant_id,
            source_type="meeting_notes",
            source_id=None,
            chunk_index=0,
            content=notes,
            language=payload.get("transcript_language"),
        )
        session.add(chunk)

    await session.commit()
    await session.refresh(meeting)
    await session.refresh(meeting, attribute_names=["participants"])  # ensure participants loaded
    return meeting


async def count_chunks_for_meeting(session: AsyncSession, meeting_id: UUID) -> int:
    result = await session.execute(
        select(func.count()).select_from(DocChunk).where(DocChunk.meeting_id == meeting_id)
    )
    return int(result.scalar() or 0)
