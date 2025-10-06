from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas.admin import (
    AccountCreate,
    AccountOut,
    AccountUpdate,
    Message,
    PlanCreate,
    PlanOut,
    PlanUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
)
from ..services import admin as admin_service

SCHEMA_NOT_READY_MESSAGE = "Schema de administração não inicializado. Execute pulsehub-db-schema.sql no banco antes de usar o módulo."

router = APIRouter(prefix="/admin", tags=["admin"])


# ===== Plans =====


@router.get("/plans", response_model=List[PlanOut])
async def list_plans(session: AsyncSession = Depends(get_session)):
    """Lista todos os planos disponíveis."""
    plans = await admin_service.list_plans(session)
    return plans


@router.post("/plans", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(payload: PlanCreate, session: AsyncSession = Depends(get_session)):
    """Cria um novo plano."""
    try:
        plan = await admin_service.create_plan(session, payload.model_dump())
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return plan


@router.put("/plans/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: UUID, payload: PlanUpdate, session: AsyncSession = Depends(get_session)):
    """Atualiza um plano existente."""
    try:
        plan = await admin_service.update_plan(session, plan_id, payload.model_dump(exclude_unset=True))
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plano não encontrado") from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return plan


@router.delete("/plans/{plan_id}", response_model=Message)
async def delete_plan(plan_id: UUID, session: AsyncSession = Depends(get_session)):
    """Remove um plano."""
    try:
        await admin_service.delete_plan(session, plan_id)
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return Message(detail="Plano removido com sucesso")


# ===== Accounts =====


@router.get("/accounts", response_model=List[AccountOut])
async def list_accounts(session: AsyncSession = Depends(get_session)):
    """Lista todas as contas cadastradas."""
    accounts = await admin_service.list_accounts(session)
    return accounts


@router.get("/accounts/{account_id}", response_model=AccountOut)
async def get_account(account_id: UUID, session: AsyncSession = Depends(get_session)):
    """Retorna os detalhes de uma conta."""
    account = await admin_service.get_account(session, account_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")
    return account


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(payload: AccountCreate, session: AsyncSession = Depends(get_session)):
    """Cria uma nova conta (empresa cliente)."""
    try:
        account = await admin_service.create_account(session, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return account


@router.put("/accounts/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: UUID,
    payload: AccountUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Atualiza uma conta existente."""
    try:
        account = await admin_service.update_account(
            session,
            account_id,
            payload.model_dump(exclude_unset=True),
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return account


@router.delete("/accounts/{account_id}", response_model=Message)
async def delete_account(account_id: UUID, session: AsyncSession = Depends(get_session)):
    """Remove uma conta."""
    try:
        await admin_service.delete_account(session, account_id)
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return Message(detail="Conta removida com sucesso")


@router.get("/accounts/{account_id}/projects", response_model=List[ProjectOut])
async def list_projects(account_id: UUID, session: AsyncSession = Depends(get_session)):
    """Lista projetos associados a uma conta."""
    try:
        projects = await admin_service.list_projects(session, account_id)
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return projects


@router.post(
    "/accounts/{account_id}/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(account_id: UUID, payload: ProjectCreate, session: AsyncSession = Depends(get_session)):
    try:
        project = await admin_service.create_project(session, account_id, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return project


@router.put("/accounts/{account_id}/projects/{project_id}", response_model=ProjectOut)
async def update_project(
    account_id: UUID,
    project_id: UUID,
    payload: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        project = await admin_service.update_project(
            session,
            account_id,
            project_id,
            payload.model_dump(exclude_unset=True),
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return project


@router.delete(
    "/accounts/{account_id}/projects/{project_id}",
    response_model=Message,
)
async def delete_project(account_id: UUID, project_id: UUID, session: AsyncSession = Depends(get_session)):
    try:
        await admin_service.delete_project(session, account_id, project_id)
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado") from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return Message(detail="Projeto removido com sucesso")


@router.get("/accounts/{account_id}/users", response_model=List[UserOut])
async def list_users(account_id: UUID, session: AsyncSession = Depends(get_session)):
    """Lista usuários pertencentes a uma conta."""
    try:
        users = await admin_service.list_users(session, account_id)
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return users


@router.post(
    "/accounts/{account_id}/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(account_id: UUID, payload: UserCreate, session: AsyncSession = Depends(get_session)):
    try:
        user = await admin_service.create_user(session, account_id, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return user


@router.put("/accounts/{account_id}/users/{user_id}", response_model=UserOut)
async def update_user(
    account_id: UUID,
    user_id: UUID,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_session),
):
    try:
        user = await admin_service.update_user(
            session,
            account_id,
            user_id,
            payload.model_dump(exclude_unset=True),
        )
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return user


@router.delete(
    "/accounts/{account_id}/users/{user_id}",
    response_model=Message,
)
async def delete_user(account_id: UUID, user_id: UUID, session: AsyncSession = Depends(get_session)):
    try:
        await admin_service.delete_user(session, account_id, user_id)
    except NoResultFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado") from exc
    except SQLAlchemyError as exc:
        if admin_service.is_missing_admin_schema(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=SCHEMA_NOT_READY_MESSAGE,
            ) from exc
        raise
    return Message(detail="Usuário removido com sucesso")
