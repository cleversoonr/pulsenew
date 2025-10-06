from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.area import AreaCreate, AreaResponse, AreaUpdate
from app.services import area as area_service

router = APIRouter(prefix="/areas", tags=["areas"])


@router.get("", response_model=List[AreaResponse])
async def list_areas(
    account_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """List all areas for a given account"""
    areas = await area_service.list_areas(session, account_id)
    return areas


@router.get("/{area_id}", response_model=AreaResponse)
async def get_area(
    area_id: UUID,
    account_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Get a specific area by ID"""
    area = await area_service.get_area(session, area_id, account_id)
    if not area:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    return area


@router.post("", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
async def create_area(
    account_id: UUID,
    data: AreaCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new area"""
    try:
        area = await area_service.create_area(session, account_id, data)
        await session.commit()
        return area
    except Exception as e:
        await session.rollback()
        if "uq_area_account_key" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Area with key '{data.key}' already exists for this account",
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{area_id}", response_model=AreaResponse)
async def update_area(
    area_id: UUID,
    account_id: UUID,
    data: AreaUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update an existing area"""
    try:
        area = await area_service.update_area(session, area_id, account_id, data)
        if not area:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
        await session.commit()
        return area
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(
    area_id: UUID,
    account_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete an area"""
    try:
        success = await area_service.delete_area(session, area_id, account_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
        await session.commit()
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
