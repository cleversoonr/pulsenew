from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.meeting_type import MeetingTypeCreate, MeetingTypeOut, MeetingTypeUpdate
from ..services import meeting_type as meeting_type_service

router = APIRouter(prefix="/meeting-types", tags=["meeting_types"])


@router.get("", response_model=List[MeetingTypeOut])
@router.get("/", response_model=List[MeetingTypeOut])
async def list_meeting_types(
    account_id: UUID = Query(..., description="Filtra tipos por conta"),
    include_inactive: bool = Query(True),
    session: AsyncSession = Depends(get_session),
):
    meeting_types = await meeting_type_service.list_meeting_types(
        session, account_id=account_id, include_inactive=include_inactive
    )
    return meeting_types


@router.post("", response_model=MeetingTypeOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MeetingTypeOut, status_code=status.HTTP_201_CREATED)
async def create_meeting_type(
    payload: MeetingTypeCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        meeting_type = await meeting_type_service.create_meeting_type(
            session, payload.model_dump()
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return meeting_type


@router.put("/{meeting_type_id}", response_model=MeetingTypeOut)
async def update_meeting_type(
    meeting_type_id: UUID,
    payload: MeetingTypeUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        meeting_type = await meeting_type_service.update_meeting_type(
            session, meeting_type_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return meeting_type


@router.delete("/{meeting_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting_type(
    meeting_type_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    try:
        await meeting_type_service.delete_meeting_type(session, meeting_type_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return None
