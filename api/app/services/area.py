from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area
from app.schemas.area import AreaCreate, AreaUpdate


async def list_areas(session: AsyncSession, account_id: UUID) -> List[Area]:
    """List all areas for a given account"""
    stmt = select(Area).where(Area.account_id == account_id).order_by(Area.name)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_area(session: AsyncSession, area_id: UUID, account_id: UUID) -> Optional[Area]:
    """Get a specific area by ID and account"""
    stmt = select(Area).where(Area.id == area_id, Area.account_id == account_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_area(session: AsyncSession, account_id: UUID, data: AreaCreate) -> Area:
    """Create a new area"""
    area = Area(
        account_id=account_id,
        key=data.key,
        name=data.name,
        description=data.description,
        is_active=data.is_active,
    )
    session.add(area)
    await session.flush()
    await session.refresh(area)
    return area


async def update_area(
    session: AsyncSession, area_id: UUID, account_id: UUID, data: AreaUpdate
) -> Optional[Area]:
    """Update an existing area"""
    area = await get_area(session, area_id, account_id)
    if not area:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        stmt = (
            update(Area)
            .where(Area.id == area_id, Area.account_id == account_id)
            .values(**update_data)
            .returning(Area)
        )
        result = await session.execute(stmt)
        return result.scalar_one()

    return area


async def delete_area(session: AsyncSession, area_id: UUID, account_id: UUID) -> bool:
    """Delete an area"""
    area = await get_area(session, area_id, account_id)
    if not area:
        return False

    await session.delete(area)
    await session.flush()
    return True
