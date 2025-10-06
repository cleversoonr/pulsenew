from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from ..models.admin import Project
from ..models.task import Task, TaskType
from ..schemas.task import TASK_PRIORITY_ALLOWED, TASK_STATUS_ALLOWED


async def _assert_project_belongs_to_account(session: AsyncSession, account_id: UUID, project_id: UUID) -> Project:
    stmt = select(Project).where(Project.id == project_id, Project.account_id == account_id)
    result = await session.scalars(stmt)
    project = result.first()
    if not project:
        raise ValueError("Projeto informado não pertence à conta")
    return project


async def _assert_task_type_belongs_to_account(
    session: AsyncSession, account_id: UUID, task_type_id: Optional[UUID]
) -> Optional[TaskType]:
    if not task_type_id:
        return None
    stmt = select(TaskType).where(TaskType.id == task_type_id, TaskType.account_id == account_id)
    result = await session.scalars(stmt)
    task_type = result.first()
    if not task_type:
        raise ValueError("Tipo de tarefa informado não pertence à conta")
    return task_type


# ===== Task Types =====


async def list_task_types(session: AsyncSession, account_id: UUID) -> List[TaskType]:
    stmt = select(TaskType).where(TaskType.account_id == account_id).order_by(TaskType.name.asc())
    result = await session.scalars(stmt)
    return list(result.all())


async def create_task_type(session: AsyncSession, account_id: UUID, payload: Dict[str, Any]) -> TaskType:
    key = payload["key"].strip()
    name = payload["name"].strip()
    workflow = payload.get("workflow") or {}
    if not isinstance(workflow, dict):
        raise ValueError("Workflow inválido")

    task_type = TaskType(
        account_id=account_id,
        key=key,
        name=name,
        description=payload.get("description"),
        workflow=workflow,
    )
    session.add(task_type)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if "uq_task_type_account_key" in str(exc).lower():
            raise ValueError("Já existe um tipo com essa chave nessa conta") from exc
        raise
    await session.refresh(task_type)
    return task_type


async def update_task_type(
    session: AsyncSession,
    account_id: UUID,
    task_type_id: UUID,
    payload: Dict[str, Any],
) -> TaskType:
    stmt = select(TaskType).where(TaskType.id == task_type_id, TaskType.account_id == account_id)
    result = await session.scalars(stmt)
    task_type = result.first()
    if not task_type:
        raise ValueError("Tipo de tarefa não encontrado")

    if "key" in payload and payload["key"] is not None:
        payload["key"] = payload["key"].strip()
    if "name" in payload and payload["name"] is not None:
        payload["name"] = payload["name"].strip()
    if "workflow" in payload and payload["workflow"] is not None and not isinstance(payload["workflow"], dict):
        raise ValueError("Workflow inválido")

    for key, value in payload.items():
        setattr(task_type, key, value)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if "uq_task_type_account_key" in str(exc).lower():
            raise ValueError("Já existe um tipo com essa chave nessa conta") from exc
        raise
    await session.refresh(task_type)
    return task_type


async def delete_task_type(session: AsyncSession, account_id: UUID, task_type_id: UUID) -> None:
    stmt = delete(TaskType).where(TaskType.id == task_type_id, TaskType.account_id == account_id)
    result = await session.execute(stmt)
    if result.rowcount == 0:
        raise ValueError("Tipo de tarefa não encontrado")
    await session.commit()


# ===== Tasks =====


async def list_tasks(
    session: AsyncSession,
    *,
    account_id: UUID,
    project_id: Optional[UUID] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
) -> List[Task]:
    stmt = (
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(Project.account_id == account_id)
        .options(joinedload(Task.task_type))
        .order_by(Task.created_at.desc())
    )

    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    if status:
        if status not in TASK_STATUS_ALLOWED:
            raise ValueError("Status de tarefa inválido")
        stmt = stmt.where(Task.status == status)
    if priority:
        if priority not in TASK_PRIORITY_ALLOWED:
            raise ValueError("Prioridade inválida")
        stmt = stmt.where(Task.priority == priority)

    result = await session.scalars(stmt)
    return list(result.unique().all())


async def get_task(session: AsyncSession, task_id: UUID, account_id: UUID) -> Task:
    stmt = (
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(Task.id == task_id, Project.account_id == account_id)
        .options(joinedload(Task.task_type))
    )
    result = await session.scalars(stmt)
    task = result.first()
    if not task:
        raise ValueError("Tarefa não encontrada")
    return task


async def create_task(session: AsyncSession, payload: Dict[str, Any]) -> Task:
    data = payload.copy()
    account_id: UUID = data.pop("account_id")
    project_id: UUID = data["project_id"]
    project = await _assert_project_belongs_to_account(session, account_id, project_id)

    task_type_id = data.get("task_type_id")
    await _assert_task_type_belongs_to_account(session, account_id, task_type_id)

    parent_id = data.get("parent_id")
    if parent_id:
        parent_task = await get_task(session, parent_id, account_id)
        data["parent_id"] = parent_task.id

    task = Task(
        project_id=project.id,
        parent_id=data.get("parent_id"),
        task_type_id=task_type_id,
        external_ref=data.get("external_ref"),
        title=data["title"],
        description=data.get("description"),
        status=data.get("status", "backlog"),
        priority=data.get("priority", "medium"),
        estimate_hours=data.get("estimate_hours"),
        actual_hours=data.get("actual_hours"),
        story_points=data.get("story_points"),
        due_date=data.get("due_date"),
        started_at=data.get("started_at"),
        completed_at=data.get("completed_at"),
        assignee_id=data.get("assignee_id"),
        created_by=data.get("created_by"),
        updated_by=data.get("updated_by"),
    )
    session.add(task)
    await session.commit()
    await session.refresh(task, attribute_names=["task_type"])
    return task


async def update_task(session: AsyncSession, task_id: UUID, account_id: UUID, payload: Dict[str, Any]) -> Task:
    task = await get_task(session, task_id, account_id)

    if "project_id" in payload and payload["project_id"] and payload["project_id"] != task.project_id:
        await _assert_project_belongs_to_account(session, account_id, payload["project_id"])
        task.project_id = payload["project_id"]

    if "task_type_id" in payload:
        await _assert_task_type_belongs_to_account(session, account_id, payload.get("task_type_id"))

    if "parent_id" in payload and payload["parent_id"]:
        parent_task = await get_task(session, payload["parent_id"], account_id)
        payload["parent_id"] = parent_task.id

    for key, value in payload.items():
        if key in {"project_id", "account_id"}:
            continue
        setattr(task, key, value)

    await session.commit()
    await session.refresh(task, attribute_names=["task_type"])
    return task


async def delete_task(session: AsyncSession, task_id: UUID, account_id: UUID) -> None:
    task = await get_task(session, task_id, account_id)
    await session.delete(task)
    await session.commit()

async def get_task_type(session: AsyncSession, account_id: UUID, task_type_id: UUID) -> TaskType:
    stmt = select(TaskType).where(TaskType.id == task_type_id, TaskType.account_id == account_id)
    result = await session.scalars(stmt)
    task_type = result.first()
    if not task_type:
        raise ValueError("Tipo de tarefa não encontrado")
    return task_type
