from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.sprint import SprintCreate, SprintOut, SprintUpdate
from ..schemas.task import TaskSummary
from ..services import sprint as sprint_service

router = APIRouter(prefix="/sprints", tags=["sprints"])


@router.get("", response_model=List[SprintOut])
@router.get("/", response_model=List[SprintOut])
async def list_sprints(
    account_id: UUID = Query(..., description="Identificador da conta"),
    project_id: Optional[UUID] = Query(None, description="Projeto ao qual o sprint pertence"),
    without_project: bool = Query(False, description="Retorna somente sprints sem projeto"),
    status: Optional[str] = Query(None, description="Filtra por status"),
    session: AsyncSession = Depends(get_session),
):
    sprints = await sprint_service.list_sprints(
        session,
        account_id=account_id,
        project_id=project_id,
        without_project=without_project,
        status=status,
    )
    return sprints


@router.post("", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SprintOut, status_code=status.HTTP_201_CREATED)
async def create_sprint(payload: SprintCreate, session: AsyncSession = Depends(get_session)):
    try:
        sprint = await sprint_service.create_sprint(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return sprint


@router.get("/{sprint_id}", response_model=SprintOut)
async def get_sprint(sprint_id: UUID, session: AsyncSession = Depends(get_session)):
    try:
        sprint = await sprint_service.get_sprint(session, sprint_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return sprint


@router.put("/{sprint_id}", response_model=SprintOut)
async def update_sprint(
    sprint_id: UUID,
    payload: SprintUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        sprint = await sprint_service.update_sprint(session, sprint_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return sprint


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(sprint_id: UUID, session: AsyncSession = Depends(get_session)):
    await sprint_service.delete_sprint(session, sprint_id)
    return None


@router.get("/available-tasks", response_model=List[TaskSummary])
async def list_available_tasks(
    account_id: UUID = Query(..., description="Identificador da conta"),
    project_id: Optional[UUID] = Query(None, description="Projeto ao qual as tarefas pertencem"),
    status: Optional[str] = Query(None, description="Filtra por status da tarefa"),
    session: AsyncSession = Depends(get_session),
):
    tasks = await sprint_service.list_tasks_for_project(
        session,
        account_id=account_id,
        project_id=project_id,
        status=status,
    )
    return tasks
