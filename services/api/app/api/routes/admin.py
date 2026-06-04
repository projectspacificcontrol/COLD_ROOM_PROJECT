from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import admin_user, require_csrf
from app.core.security import client_ip, hash_password
from app.db.session import get_session
from app.models.entities import Alert, AuditLog, CurrentRoomSnapshot, IngestionStatus, IpAllowlistEntry, Role, Room, Sensor, SensorFault, SystemSetting, Threshold, User
from app.schemas.admin import (
    AuditLogOut,
    AdminOverviewOut,
    IpAllowlistIn,
    IpAllowlistOut,
    SystemSettingIn,
    SystemSettingOut,
    ThresholdIn,
    ThresholdOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.schemas.dashboard import AdminHealthOut
from app.services.audit import write_audit

router = APIRouter(prefix="/admin", tags=["admin"])


async def _role_id(session: AsyncSession, role_name: str) -> int:
    result = await session.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown role: {role_name}")
    return role.id


def _user_out(user: User) -> dict:
    return {"id": user.id, "email": user.email, "role": user.role.name, "is_active": user.is_active, "created_at": user.created_at}


@router.get("/users", response_model=list[UserOut])
async def users(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[dict]:
    result = await session.execute(select(User).options(selectinload(User.role)).order_by(User.email))
    return [_user_out(user) for user in result.scalars().all()]


@router.get("/overview", response_model=AdminOverviewOut)
async def admin_overview(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    ingestion = list((await session.execute(select(IngestionStatus).order_by(IngestionStatus.source))).scalars().all())
    snapshots = list((await session.execute(select(CurrentRoomSnapshot))).scalars().all())
    active_alerts = (await session.execute(select(func.count()).select_from(Alert).where(Alert.status == "open"))).scalar_one()
    sensor_faults = (await session.execute(select(func.count()).select_from(SensorFault).where(SensorFault.status == "open"))).scalar_one()
    recent = await audit_logs(_, session)
    last_success = max((item.last_success_at for item in ingestion if item.last_success_at), default=None)
    source_health = "healthy" if ingestion and all(item.last_error is None for item in ingestion) else "degraded" if ingestion else "not_configured"
    return {
        "live_ingestion_status": [
            {
                "source": item.source,
                "last_success_at": item.last_success_at,
                "last_error_at": item.last_error_at,
                "last_error": item.last_error,
                "rows_ingested": item.rows_ingested,
            }
            for item in ingestion
        ],
        "last_successful_fetch_at": last_success,
        "rooms_online": sum(1 for item in snapshots if item.status != "offline"),
        "rooms_offline": sum(1 for item in snapshots if item.status == "offline"),
        "active_alerts": active_alerts,
        "sensor_faults": sensor_faults,
        "api_source_health": source_health,
        "database_health": "healthy",
        "recent_admin_actions": recent[:10],
    }


@router.get("/rooms")
async def admin_rooms(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[dict]:
    rooms = list((await session.execute(select(Room).order_by(Room.room_number))).scalars().all())
    sensors = list((await session.execute(select(Sensor).order_by(Sensor.source_tag))).scalars().all())
    sensors_by_room: dict[int, list[dict]] = {}
    for sensor in sensors:
        sensors_by_room.setdefault(sensor.room_id, []).append({"id": sensor.id, "source_tag": sensor.source_tag, "label": sensor.display_label})
    return [
        {
            "id": room.id,
            "room_number": room.room_number,
            "name": room.name,
            "group_code": room.group_code,
            "sensors": sensors_by_room.get(room.id, []),
        }
        for room in rooms
    ]


@router.post("/users", response_model=UserOut, dependencies=[Depends(require_csrf)])
async def create_user(payload: UserCreate, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    user = User(email=payload.email, password_hash=hash_password(payload.password), role_id=await _role_id(session, payload.role), is_active=payload.is_active)
    session.add(user)
    await session.flush()
    await write_audit(session, actor, "create", "user", str(user.id), {"email": payload.email, "role": payload.role}, client_ip(request))
    await session.commit()
    result = await session.execute(select(User).options(selectinload(User.role)).where(User.id == user.id))
    return _user_out(result.scalar_one())


@router.put("/users/{user_id}", response_model=UserOut, dependencies=[Depends(require_csrf)])
async def update_user(user_id: int, payload: UserUpdate, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    result = await session.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.email is not None:
        user.email = payload.email
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.role is not None:
        user.role_id = await _role_id(session, payload.role)
    if payload.is_active is not None:
        user.is_active = payload.is_active
    await write_audit(session, actor, "update", "user", str(user.id), payload.model_dump(exclude_none=True, exclude={"password"}), client_ip(request))
    await session.commit()
    result = await session.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    return _user_out(result.scalar_one())


@router.delete("/users/{user_id}", dependencies=[Depends(require_csrf)])
async def delete_user(user_id: int, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(delete(User).where(User.id == user_id))
    await write_audit(session, actor, "delete", "user", str(user_id), None, client_ip(request))
    await session.commit()
    return {"status": "deleted"}


@router.get("/ip-allowlist", response_model=list[IpAllowlistOut])
async def list_ip_allowlist(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[IpAllowlistEntry]:
    result = await session.execute(select(IpAllowlistEntry).order_by(IpAllowlistEntry.cidr))
    return list(result.scalars().all())


@router.post("/ip-allowlist", dependencies=[Depends(require_csrf)])
async def add_ip_allowlist(payload: IpAllowlistIn, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    entry = IpAllowlistEntry(**payload.model_dump(), created_by_user_id=actor.id)
    session.add(entry)
    await session.flush()
    await write_audit(session, actor, "create", "ip_allowlist", str(entry.id), payload.model_dump(), client_ip(request))
    await session.commit()
    return {"status": "saved", "id": entry.id}


@router.put("/ip-allowlist/{entry_id}", response_model=IpAllowlistOut, dependencies=[Depends(require_csrf)])
async def update_ip_allowlist(entry_id: int, payload: IpAllowlistIn, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> IpAllowlistEntry:
    entry = await session.get(IpAllowlistEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allowlist entry not found")
    entry.cidr = payload.cidr
    entry.label = payload.label
    entry.description = payload.description
    entry.scope = payload.scope
    entry.is_active = payload.is_active
    await write_audit(session, actor, "update", "ip_allowlist", str(entry.id), payload.model_dump(), client_ip(request))
    await session.commit()
    return entry


@router.delete("/ip-allowlist/{entry_id}", dependencies=[Depends(require_csrf)])
async def delete_ip_allowlist(entry_id: int, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(delete(IpAllowlistEntry).where(IpAllowlistEntry.id == entry_id))
    await write_audit(session, actor, "delete", "ip_allowlist", str(entry_id), None, client_ip(request))
    await session.commit()
    return {"status": "deleted"}


@router.get("/thresholds", response_model=list[ThresholdOut])
async def thresholds(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[Threshold]:
    result = await session.execute(select(Threshold).order_by(Threshold.scope_type, Threshold.scope_id))
    return list(result.scalars().all())


@router.post("/thresholds", dependencies=[Depends(require_csrf)])
async def upsert_threshold(payload: ThresholdIn, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    result = await session.execute(
        select(Threshold).where(
            Threshold.scope_type == payload.scope_type,
            Threshold.scope_id == payload.scope_id,
            Threshold.scope_key == payload.scope_key,
        )
    )
    threshold = result.scalar_one_or_none()
    if threshold is None:
        threshold = Threshold(**payload.model_dump())
        session.add(threshold)
    else:
        for key, value in payload.model_dump().items():
            setattr(threshold, key, value)
    await session.flush()
    await write_audit(session, actor, "upsert", "threshold", str(threshold.id), payload.model_dump(), client_ip(request))
    await session.commit()
    return {"status": "saved", "id": threshold.id}


@router.put("/thresholds/{threshold_id}", response_model=ThresholdOut, dependencies=[Depends(require_csrf)])
async def update_threshold(threshold_id: int, payload: ThresholdIn, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> Threshold:
    threshold = await session.get(Threshold, threshold_id)
    if threshold is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Threshold not found")
    for key, value in payload.model_dump().items():
        setattr(threshold, key, value)
    await write_audit(session, actor, "update", "threshold", str(threshold.id), payload.model_dump(), client_ip(request))
    await session.commit()
    return threshold


@router.delete("/thresholds/{threshold_id}", dependencies=[Depends(require_csrf)])
async def delete_threshold(threshold_id: int, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(delete(Threshold).where(Threshold.id == threshold_id))
    await write_audit(session, actor, "delete", "threshold", str(threshold_id), None, client_ip(request))
    await session.commit()
    return {"status": "deleted"}


@router.get("/thresholds/effective")
async def effective_threshold(room_id: int | None = None, sensor_id: int | None = None, _: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    thresholds = list((await session.execute(select(Threshold).where(Threshold.is_active.is_(True)))).scalars().all())
    selected = next((item for item in thresholds if item.scope_type == "global"), None)
    room: Room | None = None
    sensor: Sensor | None = None
    if sensor_id is not None:
        sensor = await session.get(Sensor, sensor_id)
        if sensor:
            room = await session.get(Room, sensor.room_id)
    elif room_id is not None:
        room = await session.get(Room, room_id)
    if room:
        selected = next((item for item in thresholds if item.scope_type == "group" and item.scope_key == room.group_code), selected)
        selected = next((item for item in thresholds if item.scope_type == "room" and item.scope_id == room.id), selected)
    if sensor:
        selected = next((item for item in thresholds if item.scope_type == "sensor" and item.scope_id == sensor.id), selected)
    if selected is None:
        return {"rule": None}
    return {
        "rule": {
            "id": selected.id,
            "scope_type": selected.scope_type,
            "scope_id": selected.scope_id,
            "scope_key": selected.scope_key,
            "warning_min_c": float(selected.warning_min_c) if selected.warning_min_c is not None else None,
            "warning_max_c": float(selected.warning_max_c) if selected.warning_max_c is not None else None,
            "critical_min_c": float(selected.critical_min_c) if selected.critical_min_c is not None else None,
            "critical_max_c": float(selected.critical_max_c) if selected.critical_max_c is not None else None,
            "stale_after_seconds": selected.stale_after_seconds,
        }
    }


@router.get("/system-health", response_model=list[AdminHealthOut])
async def system_health(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[IngestionStatus]:
    result = await session.execute(select(IngestionStatus).order_by(IngestionStatus.source))
    return list(result.scalars().all())


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def audit_logs(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[dict]:
    result = await session.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500))
    return [
        {
            "id": log.id,
            "actor_user_id": log.actor_user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "metadata": log.metadata_json,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
        }
        for log in result.scalars().all()
    ]


@router.get("/alerts")
async def admin_alerts(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[dict]:
    result = await session.execute(select(Alert).order_by(Alert.opened_at.desc()).limit(500))
    return [
        {
            "id": alert.id,
            "room_id": alert.room_id,
            "sensor_id": alert.sensor_id,
            "severity": alert.severity,
            "status": alert.status,
            "message": alert.message,
            "opened_at": alert.opened_at,
            "last_seen_at": alert.last_seen_at,
        }
        for alert in result.scalars().all()
    ]


@router.get("/sensor-faults")
async def admin_sensor_faults(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[dict]:
    result = await session.execute(select(SensorFault).order_by(SensorFault.opened_at.desc()).limit(500))
    return [
        {
            "id": fault.id,
            "room_id": fault.room_id,
            "sensor_id": fault.sensor_id,
            "source_tag": fault.source_tag,
            "fault_type": fault.fault_type,
            "status": fault.status,
            "message": fault.message,
            "opened_at": fault.opened_at,
            "last_seen_at": fault.last_seen_at,
        }
        for fault in result.scalars().all()
    ]


@router.get("/settings", response_model=list[SystemSettingOut])
async def settings(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> list[dict]:
    result = await session.execute(select(SystemSetting).order_by(SystemSetting.key))
    return [
        {"key": setting.key, "value": "***" if setting.is_secret else setting.value, "is_secret": setting.is_secret, "updated_at": setting.updated_at}
        for setting in result.scalars().all()
    ]


@router.put("/settings/{key}", dependencies=[Depends(require_csrf)])
async def upsert_setting(key: str, payload: SystemSettingIn, request: Request, actor: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    setting = await session.get(SystemSetting, key)
    if setting is None:
        setting = SystemSetting(key=key, value=payload.value, is_secret=payload.is_secret)
        session.add(setting)
    else:
        setting.value = payload.value
        setting.is_secret = payload.is_secret
    await write_audit(session, actor, "upsert", "system_setting", key, {"is_secret": payload.is_secret}, client_ip(request))
    await session.commit()
    return {"status": "saved", "key": key}
