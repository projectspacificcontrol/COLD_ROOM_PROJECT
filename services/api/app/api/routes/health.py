from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.entities import Alert, SensorFault

router = APIRouter(prefix="/health", tags=["health"])
ready_router = APIRouter(tags=["health"])
metrics_router = APIRouter(tags=["metrics"])


@router.get("")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@ready_router.get("/ready")
async def ready(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    return {"status": "ready"}


@metrics_router.get("/metrics", response_class=PlainTextResponse)
async def metrics(session: AsyncSession = Depends(get_session)) -> str:
    active_alerts = (await session.execute(select(func.count()).select_from(Alert).where(Alert.status == "open"))).scalar_one()
    open_faults = (await session.execute(select(func.count()).select_from(SensorFault).where(SensorFault.status == "open"))).scalar_one()
    return "\n".join(
        [
            "# HELP cold_room_active_alerts Open cold room alerts.",
            "# TYPE cold_room_active_alerts gauge",
            f"cold_room_active_alerts {active_alerts}",
            "# HELP cold_room_sensor_faults Open sensor faults.",
            "# TYPE cold_room_sensor_faults gauge",
            f"cold_room_sensor_faults {open_faults}",
            "",
        ]
    )
