from __future__ import annotations

from datetime import date
from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.sprint import HolidayCalendar, Sprint, SprintTask, UserCapacity
from ..models.task import Task
from ..schemas.sprint import SprintCreate, SprintTaskInput, SprintUpdate


def _validate_dates(starts_at: date, ends_at: date) -> None:
    if ends_at < starts_at:
        raise ValueError("Data de término não pode ser anterior à data de início")


async def list_sprints(
    session: AsyncSession,
    *,
    account_id: UUID,
    project_id: Optional[UUID] = None,
    without_project: bool = False,
    status: Optional[str] = None,
) -> List[Sprint]:
    stmt = (
        select(Sprint)
        .where(Sprint.account_id == account_id)
        .options(
            selectinload(Sprint.assignments).selectinload(SprintTask.task),
            selectinload(Sprint.capacities),
        )
        .order_by(Sprint.starts_at.asc())
    )
    if project_id:
        stmt = stmt.where(Sprint.project_id == project_id)
    elif without_project:
        stmt = stmt.where(Sprint.project_id.is_(None))
    if status:
        stmt = stmt.where(Sprint.status == status)

    result = await session.scalars(stmt)
    return list(result.unique().all())


async def get_sprint(session: AsyncSession, sprint_id: UUID) -> Sprint:
    stmt = (
        select(Sprint)
        .where(Sprint.id == sprint_id)
        .options(
            selectinload(Sprint.assignments).selectinload(SprintTask.task),
            selectinload(Sprint.capacities),
        )
    )
    result = await session.scalars(stmt)
    sprint = result.first()
    if not sprint:
        raise LookupError("Sprint não encontrado")
    return sprint


def _build_assignments(
    payload: List[SprintTaskInput],
    account_id: UUID,
    sprint_id: UUID,
) -> List[SprintTask]:
    assignments: List[SprintTask] = []
    for item in payload:
        assignments.append(
            SprintTask(
                sprint_id=sprint_id,
                task_id=item.task_id,
                account_id=account_id,
                planned_hours=item.planned_hours,
                planned_points=item.planned_points,
                status=item.status,
                notes=item.notes,
                position=item.position,
            )
        )
    return assignments


async def create_sprint(session: AsyncSession, payload: SprintCreate) -> Sprint:
    _validate_dates(payload.starts_at, payload.ends_at)

    if payload.tasks:
        task_ids = [item.task_id for item in payload.tasks]
        stmt = select(Task).where(Task.id.in_(task_ids))
        tasks = await session.scalars(stmt)
        tasks_by_id = {task.id: task for task in tasks}
        missing = [task_id for task_id in task_ids if task_id not in tasks_by_id]
        if missing:
            raise ValueError("Uma ou mais tarefas informadas não foram encontradas")
        for task in tasks_by_id.values():
            if payload.project_id and task.project_id != payload.project_id:
                raise ValueError("Todas as tarefas devem pertencer ao mesmo projeto do sprint")
        if not payload.project_id:
            raise ValueError("Selecione um projeto para adicionar tarefas ao sprint")

    sprint = Sprint(
        account_id=payload.account_id,
        project_id=payload.project_id,
        name=payload.name,
        goal=payload.goal,
        sprint_number=payload.sprint_number,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=payload.status,
    )
    session.add(sprint)
    await session.flush()

    # Anexar tarefas
    assignments = _build_assignments(payload.tasks, payload.account_id, sprint.id)
    for assignment in assignments:
        session.add(assignment)

    # Capacidade
    for capacity in payload.capacities:
        session.add(
            UserCapacity(
                account_id=payload.account_id,
                user_id=capacity.user_id,
                sprint_id=sprint.id,
                week_start=capacity.week_start,
                hours=capacity.hours,
            )
        )

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ValueError("Não foi possível criar o sprint. Verifique relacionamentos informados.") from exc

    await session.refresh(sprint)
    await session.refresh(sprint, attribute_names=["assignments", "capacities"])
    for assignment in sprint.assignments:
        await session.refresh(assignment, attribute_names=["task"])

    return sprint


async def update_sprint(session: AsyncSession, sprint_id: UUID, payload: SprintUpdate) -> Sprint:
    sprint = await get_sprint(session, sprint_id)

    update_data = payload.model_dump(exclude_unset=True, exclude={"tasks", "capacities"})
    if "starts_at" in update_data or "ends_at" in update_data:
        starts_at = update_data.get("starts_at", sprint.starts_at)
        ends_at = update_data.get("ends_at", sprint.ends_at)
        _validate_dates(starts_at, ends_at)

    for field, value in update_data.items():
        setattr(sprint, field, value)

    if payload.tasks is not None:
        if payload.tasks:
            task_ids = [item.task_id for item in payload.tasks]
            stmt = select(Task).where(Task.id.in_(task_ids))
            tasks = await session.scalars(stmt)
            tasks_by_id = {task.id: task for task in tasks}
            missing = [task_id for task_id in task_ids if task_id not in tasks_by_id]
            if missing:
                raise ValueError("Uma ou mais tarefas informadas não foram encontradas")
            for task in tasks_by_id.values():
                if sprint.project_id and task.project_id != sprint.project_id:
                    raise ValueError("Todas as tarefas devem pertencer ao mesmo projeto do sprint")
            if not sprint.project_id:
                raise ValueError("Defina um projeto antes de associar tarefas ao sprint")
        # Remove tarefas existentes
        await session.execute(delete(SprintTask).where(SprintTask.sprint_id == sprint.id))
        for assignment in _build_assignments(payload.tasks, sprint.account_id, sprint.id):
            session.add(assignment)

    if payload.capacities is not None:
        await session.execute(delete(UserCapacity).where(UserCapacity.sprint_id == sprint.id))
        for capacity in payload.capacities:
            session.add(
                UserCapacity(
                    account_id=sprint.account_id,
                    user_id=capacity.user_id,
                    sprint_id=sprint.id,
                    week_start=capacity.week_start,
                    hours=capacity.hours,
                )
            )

    await session.commit()
    await session.refresh(sprint)
    await session.refresh(sprint, attribute_names=["assignments", "capacities"])
    for assignment in sprint.assignments:
        await session.refresh(assignment, attribute_names=["task"])

    return sprint


async def delete_sprint(session: AsyncSession, sprint_id: UUID) -> None:
    await session.execute(delete(SprintTask).where(SprintTask.sprint_id == sprint_id))
    await session.execute(delete(UserCapacity).where(UserCapacity.sprint_id == sprint_id))
    await session.execute(delete(Sprint).where(Sprint.id == sprint_id))
    await session.commit()


async def list_tasks_for_project(
    session: AsyncSession,
    *,
    account_id: UUID,
    project_id: Optional[UUID],
    status: Optional[str] = None,
) -> List[Task]:
    if project_id is None:
        return []
    stmt = select(Task).where(Task.project_id == project_id)
    if status:
        stmt = stmt.where(Task.status == status)

    result = await session.scalars(stmt)
    return list(result.all())


async def list_holidays(session: AsyncSession, account_id: UUID, project_id: Optional[UUID] = None) -> List[HolidayCalendar]:
    stmt = select(HolidayCalendar).where(HolidayCalendar.account_id == account_id)
    if project_id:
        stmt = stmt.where((HolidayCalendar.project_id == project_id) | (HolidayCalendar.scope == "global"))
    result = await session.scalars(stmt)
    return list(result.all())
