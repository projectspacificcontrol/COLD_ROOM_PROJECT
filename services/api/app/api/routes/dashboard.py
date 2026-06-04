import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.dashboard import AlertOut, DashboardSnapshotOut, HistoryPointOut, OverviewOut, RoomSnapshotOut
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
live_router = APIRouter(prefix="/live", tags=["live"])


@router.get("/overview", response_model=OverviewOut)
async def overview(session: AsyncSession = Depends(get_session)) -> dict:
    return await DashboardService(session).overview()


@router.get("/summary", response_model=DashboardSnapshotOut)
async def dashboard_summary(session: AsyncSession = Depends(get_session)) -> dict:
    return await DashboardService(session).snapshot()


@router.get("/rooms", response_model=list[RoomSnapshotOut])
async def rooms(session: AsyncSession = Depends(get_session)) -> list[dict]:
    return await DashboardService(session).rooms()


@router.get("/rooms/{room_id}", response_model=RoomSnapshotOut)
async def room_detail(room_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    room = await DashboardService(session).room(room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room


@router.get("/rooms/{room_id}/history", response_model=list[HistoryPointOut])
async def room_history(
    room_id: int,
    hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=1000, ge=1, le=5000),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    return await DashboardService(session).history(room_id, hours=hours, limit=limit)


@router.get("/alerts", response_model=list[AlertOut])
async def alerts(session: AsyncSession = Depends(get_session)) -> list:
    return await DashboardService(session).alerts()


@live_router.get("")
async def dashboard_events(session: AsyncSession = Depends(get_session)) -> StreamingResponse:
    async def event_stream():
        while True:
            payload = await DashboardService(session).snapshot()
            yield f"event: dashboard.snapshot\ndata: {json.dumps(payload, default=str)}\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
