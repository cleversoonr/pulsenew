from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.task import TaskTypeCreate, TaskTypeOut, TaskTypeUpdate
from ..services import task as task_service

router = APIRouter(prefix="/task-types", tags=["task-types"])


@router.get("", response_model=List[TaskTypeOut])
async def list_task_types(
    account_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    return await task_service.list_task_types(session, account_id)


@router.post("", response_model=TaskTypeOut, status_code=status.HTTP_201_CREATED)
async def create_task_type(
    account_id: UUID,
    payload: TaskTypeCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        return await task_service.create_task_type(session, account_id, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/{task_type_id}", response_model=TaskTypeOut)
async def update_task_type(
    account_id: UUID,
    task_type_id: UUID,
    payload: TaskTypeUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        return await task_service.update_task_type(
            session,
            account_id,
            task_type_id,
            payload.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{task_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_type(
    account_id: UUID,
    task_type_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    try:
        await task_service.delete_task_type(session, account_id, task_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return None
