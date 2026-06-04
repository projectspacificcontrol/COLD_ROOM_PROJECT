from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class MeOut(BaseModel):
    id: int
    email: EmailStr
    role: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = Field(pattern="^(admin|operator|viewer)$")
    is_active: bool = True


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    role: str | None = Field(default=None, pattern="^(admin|operator|viewer)$")
    is_active: bool | None = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime


class ThresholdIn(BaseModel):
    scope_type: str = Field(pattern="^(global|group|room|sensor)$")
    scope_id: int | None = None
    scope_key: str | None = None
    normal_min_c: float | None = None
    normal_max_c: float | None = None
    warning_min_c: float | None = None
    warning_max_c: float | None = None
    critical_min_c: float | None = None
    critical_max_c: float | None = None
    stale_after_seconds: int = Field(default=900, ge=60, le=86400)
    fault_rules: dict[str, Any] | None = None
    is_active: bool = True

    @field_validator("scope_id")
    @classmethod
    def require_scope_id_for_specific_scopes(cls, value: int | None, info):
        if info.data.get("scope_type") in {"room", "sensor"} and value is None:
            raise ValueError("scope_id is required for room and sensor thresholds")
        return value


class ThresholdOut(ThresholdIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    updated_at: datetime


class IpAllowlistIn(BaseModel):
    cidr: str
    label: str | None = None
    description: str | None = None
    scope: str = Field(default="dashboard_access", pattern="^(dashboard_access|admin_access|api_access)$")
    is_active: bool = True


class IpAllowlistOut(IpAllowlistIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_user_id: int | None = None
    created_at: datetime
    last_matched_at: datetime | None = None


class SystemSettingIn(BaseModel):
    value: Any
    is_secret: bool = False


class SystemSettingOut(BaseModel):
    key: str
    value: Any
    is_secret: bool
    updated_at: datetime


class ReportRequest(BaseModel):
    start_at: datetime
    end_at: datetime
    room_numbers: list[int] | None = None
    format: str = Field(default="xlsx", pattern="^xlsx$")
    groups: list[str] | None = None
    include_alerts: bool = True
    include_faults: bool = True


class AdminOverviewOut(BaseModel):
    live_ingestion_status: list[dict[str, Any]]
    last_successful_fetch_at: datetime | None
    rooms_online: int
    rooms_offline: int
    active_alerts: int
    sensor_faults: int
    api_source_health: str
    database_health: str
    recent_admin_actions: list[dict[str, Any]]


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int | None
    action: str
    resource_type: str
    resource_id: str | None
    metadata: dict[str, Any] | None = None
    ip_address: str | None
    created_at: datetime
