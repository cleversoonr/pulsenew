from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.task import TaskCreate, TaskOut, TaskUpdate
from ..services import task as task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskOut])
async def list_tasks(
    account_id: UUID = Query(..., description="Identificador da conta"),
    project_id: Optional[UUID] = Query(None, description="Filtrar por projeto"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    priority: Optional[str] = Query(None, description="Filtrar por prioridade"),
    session: AsyncSession = Depends(get_session),
):
    try:
        return await task_service.list_tasks(
            session,
            account_id=account_id,
            project_id=project_id,
            status=status,
            priority=priority,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: UUID,
    account_id: UUID = Query(..., description="Identificador da conta"),
    session: AsyncSession = Depends(get_session),
):
    try:
        return await task_service.get_task(session, task_id, account_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, session: AsyncSession = Depends(get_session)):
    try:
        task = await task_service.create_task(session, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return task


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    account_id: UUID = Query(..., description="Identificador da conta"),
    session: AsyncSession = Depends(get_session),
):
    try:
        task = await task_service.update_task(
            session,
            task_id,
            account_id,
            payload.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    account_id: UUID = Query(..., description="Identificador da conta"),
    session: AsyncSession = Depends(get_session),
):
    try:
        await task_service.delete_task(session, task_id, account_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return None
