from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

Status = Literal["normal", "warning", "critical", "fault", "offline"]
Quality = Literal["good", "missing", "invalid", "unavailable", "impossible", "stale"]


class SensorReadingOut(BaseModel):
    source_tag: str
    label: str
    value_c: float | None
    quality: Quality
    status: Status


class RoomSnapshotOut(BaseModel):
    room_id: int
    room_number: int
    room_name: str
    group_code: str
    average_c: float | None
    status: Status
    sensors: list[SensorReadingOut]
    active_alerts: list[str] = []
    latest_log_time: datetime | None = None


class GroupSnapshotOut(BaseModel):
    group_code: str
    room_numbers: list[int]
    rooms: list[RoomSnapshotOut]


class OverviewOut(BaseModel):
    total_rooms: int
    total_sensors: int
    average_c: float | None
    active_alerts: int
    critical_alerts: int
    warning_alerts: int
    sensor_faults: int
    last_log_time: datetime | None


class DashboardSnapshotOut(BaseModel):
    overview: OverviewOut
    groups: list[GroupSnapshotOut]


class HistoryPointOut(BaseModel):
    logged_at: datetime
    average_c: float | None
    sensors: list[SensorReadingOut]


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int | None
    sensor_id: int | None
    severity: str
    status: str
    message: str
    opened_at: datetime
    last_seen_at: datetime


class IngestResultOut(BaseModel):
    rows_received: int
    rows_inserted: int
    readings_normalized: int
    missing_expected_sensors: list[str]


class AdminHealthOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: str
    last_success_at: datetime | None
    last_error_at: datetime | None
    last_error: str | None
    rows_ingested: int
