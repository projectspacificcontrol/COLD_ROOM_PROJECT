from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import admin_user
from app.db.session import get_session
from app.models.entities import User
from app.core.security import client_ip
from app.services.audit import write_audit
from app.services.reports import build_temperature_report

router = APIRouter(prefix="/admin/reports", tags=["reports"])


def _range_from_duration(duration: str | None, start_at: datetime | None, end_at: datetime | None) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    if duration:
        hours_by_duration = {"1h": 1, "8h": 8, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_by_duration[duration]
        return now.replace(microsecond=0) - timedelta(hours=hours), now.replace(microsecond=0)
    if start_at is None or end_at is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="from and to are required when duration is not provided")
    if end_at <= start_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="to must be after from")
    if end_at - start_at > timedelta(days=31):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="date range cannot exceed 31 days")
    return start_at, end_at


@router.get("/export")
async def export_report(
    request: Request,
    from_at: datetime | None = Query(default=None, alias="from"),
    to_at: datetime | None = Query(default=None, alias="to"),
    duration: str | None = Query(default=None, pattern="^(1h|8h|24h|7d|30d)$"),
    rooms: str | None = None,
    groups: str | None = None,
    include_alerts: bool = True,
    include_faults: bool = True,
    format: str = Query(default="xlsx", pattern="^xlsx$"),
    user: User = Depends(admin_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    del format
    start_at, end_at = _range_from_duration(duration, from_at, to_at)
    room_numbers = [int(item.strip()) for item in rooms.split(",") if item.strip()] if rooms else None
    group_codes = [item.strip() for item in groups.split(",") if item.strip()] if groups else None
    try:
        output = await build_temperature_report(session, start_at, end_at, room_numbers, group_codes, include_alerts, include_faults, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    await write_audit(
        session,
        user,
        "download",
        "report",
        None,
        {"from": start_at.isoformat(), "to": end_at.isoformat(), "rooms": room_numbers, "groups": group_codes, "include_alerts": include_alerts, "include_faults": include_faults},
        client_ip(request),
    )
    await session.commit()
    headers = {"Content-Disposition": 'attachment; filename="cold-room-temperature-report.xlsx"'}
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
