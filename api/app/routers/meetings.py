from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.meeting import MeetingCreate, MeetingOut
from ..services import meeting as meeting_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=List[MeetingOut])
@router.get("/", response_model=List[MeetingOut])
async def list_meetings(
    tenant_id: UUID = Query(..., description="Filtra reuniões por tenant"),
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    meetings = await meeting_service.list_meetings(session, tenant_id=tenant_id, project_id=project_id, limit=limit, offset=offset)
    # enriquecer com chunk_count
    result: List[MeetingOut] = []
    for m in meetings:
        count = await meeting_service.count_chunks_for_meeting(session, m.id)
        out = MeetingOut.model_validate({
            "id": m.id,
            "organization_id": m.organization_id,
            "tenant_id": m.tenant_id,
            "project_id": m.project_id,
            "title": m.title,
            "meeting_type": m.meeting_type,
            "occurred_at": m.occurred_at,
            "duration_minutes": m.duration_minutes,
            "transcript_language": m.transcript_language,
            "sentiment_score": m.sentiment_score,
            "source": m.source,
            "status": m.status,
            "metadata": m.metadata_json,
            "created_at": m.created_at,
            "participants": m.participants,
            "chunk_count": count,
        })
        result.append(out)
    return result


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(
    meeting_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    try:
        m = await meeting_service.get_meeting(session, meeting_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    count = await meeting_service.count_chunks_for_meeting(session, meeting_id)
    return MeetingOut.model_validate({
        "id": m.id,
        "organization_id": m.organization_id,
        "tenant_id": m.tenant_id,
        "project_id": m.project_id,
        "title": m.title,
        "meeting_type": m.meeting_type,
        "occurred_at": m.occurred_at,
        "duration_minutes": m.duration_minutes,
        "transcript_language": m.transcript_language,
        "sentiment_score": m.sentiment_score,
        "source": m.source,
        "status": m.status,
        "metadata": m.metadata_json,
        "created_at": m.created_at,
        "participants": m.participants,
        "chunk_count": count,
    })


@router.post("/", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
async def create_meeting(payload: MeetingCreate, session: AsyncSession = Depends(get_session)):
    meeting = await meeting_service.create_meeting(session, payload.model_dump())
    count = await meeting_service.count_chunks_for_meeting(session, meeting.id)
    return MeetingOut.model_validate({
        "id": meeting.id,
        "organization_id": meeting.organization_id,
        "tenant_id": meeting.tenant_id,
        "project_id": meeting.project_id,
        "title": meeting.title,
        "meeting_type": meeting.meeting_type,
        "occurred_at": meeting.occurred_at,
        "duration_minutes": meeting.duration_minutes,
        "transcript_language": meeting.transcript_language,
        "sentiment_score": meeting.sentiment_score,
        "source": meeting.source,
        "status": meeting.status,
        "metadata": meeting.metadata_json,
        "created_at": meeting.created_at,
        "participants": meeting.participants,
        "chunk_count": count,
    })
