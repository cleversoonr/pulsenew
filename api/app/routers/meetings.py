from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.meeting import MeetingCreate, MeetingOut, MeetingUpdate
from ..services import meeting as meeting_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


def serialize_meeting(meeting, chunk_count: int) -> dict:
    return {
        "id": meeting.id,
        "account_id": meeting.account_id,
        "meeting_type": {
            "id": meeting.meeting_type.id,
            "key": meeting.meeting_type.key,
            "name": meeting.meeting_type.name,
            "description": meeting.meeting_type.description,
        },
        "project_id": meeting.project_id,
        "title": meeting.title,
        "occurred_at": meeting.occurred_at,
        "duration_minutes": meeting.duration_minutes,
        "transcript_language": meeting.transcript_language,
        "sentiment_score": meeting.sentiment_score,
        "source": meeting.source,
        "status": meeting.status,
        "metadata": meeting.metadata_json,
        "notes": meeting.notes,
        "created_at": meeting.created_at,
        "updated_at": meeting.updated_at,
        "participants": meeting.participants,
        "chunk_count": chunk_count,
    }


@router.get("", response_model=List[MeetingOut])
@router.get("/", response_model=List[MeetingOut])
async def list_meetings(
    account_id: UUID = Query(..., description="Filtra reuniões por conta"),
    meeting_type_id: Optional[UUID] = Query(None),
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    meetings = await meeting_service.list_meetings(
        session,
        account_id=account_id,
        meeting_type_id=meeting_type_id,
        project_id=project_id,
        limit=limit,
        offset=offset,
    )
    result: List[MeetingOut] = []
    for mt in meetings:
        chunk_count = await meeting_service.count_chunks_for_meeting(session, mt.id)
        result.append(MeetingOut.model_validate(serialize_meeting(mt, chunk_count)))
    return result


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(
    meeting_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    try:
        meeting = await meeting_service.get_meeting(session, meeting_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    chunk_count = await meeting_service.count_chunks_for_meeting(session, meeting_id)
    return MeetingOut.model_validate(serialize_meeting(meeting, chunk_count))


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
async def create_meeting(payload: MeetingCreate, session: AsyncSession = Depends(get_session)):
    try:
        meeting = await meeting_service.create_meeting(session, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    chunk_count = await meeting_service.count_chunks_for_meeting(session, meeting.id)
    return MeetingOut.model_validate(serialize_meeting(meeting, chunk_count))


@router.put("/{meeting_id}", response_model=MeetingOut)
async def update_meeting_endpoint(
    meeting_id: UUID,
    payload: MeetingUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        meeting = await meeting_service.update_meeting(
            session, meeting_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    chunk_count = await meeting_service.count_chunks_for_meeting(session, meeting.id)
    return MeetingOut.model_validate(serialize_meeting(meeting, chunk_count))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting_endpoint(
    meeting_id: UUID,
    account_id: UUID = Query(..., description="Identificador da conta da reunião"),
    session: AsyncSession = Depends(get_session),
):
    try:
        await meeting_service.delete_meeting(session, meeting_id, account_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return None
