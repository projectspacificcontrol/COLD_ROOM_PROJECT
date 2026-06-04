from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

BIGINT_PK = BigInteger().with_variant(Integer, "sqlite")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    role: Mapped[Role] = relationship()


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    group_code: Mapped[str] = mapped_column(String(32), nullable=False)
    position_in_group: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sensors: Mapped[list["Sensor"]] = relationship(back_populates="room")


class Sensor(Base):
    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    display_label: Mapped[str] = mapped_column(String(8), nullable=False)
    source_tag: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    position_in_room: Mapped[int] = mapped_column(Integer, nullable=False)
    is_expected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    room: Mapped[Room] = relationship(back_populates="sensors")


class Threshold(Base):
    __tablename__ = "thresholds"
    __table_args__ = (UniqueConstraint("scope_type", "scope_id", name="uq_threshold_scope"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scope_type: Mapped[str] = mapped_column(String(16), nullable=False)
    scope_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scope_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    normal_min_c = mapped_column(Numeric(6, 2), nullable=True)
    normal_max_c = mapped_column(Numeric(6, 2), nullable=True)
    warning_min_c = mapped_column(Numeric(6, 2), nullable=True)
    warning_max_c = mapped_column(Numeric(6, 2), nullable=True)
    critical_min_c = mapped_column(Numeric(6, 2), nullable=True)
    critical_max_c = mapped_column(Numeric(6, 2), nullable=True)
    stale_after_seconds: Mapped[int] = mapped_column(Integer, default=900, nullable=False)
    fault_rules = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class RawIngestLog(Base):
    __tablename__ = "raw_ingest_logs"
    __table_args__ = (UniqueConstraint("source", "source_timestamp", name="uq_raw_ingest_source_timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    source_timestamp = mapped_column(DateTime(timezone=True), nullable=False)
    received_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    payload = mapped_column(JSON, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="received", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class TemperatureReading(Base):
    __tablename__ = "temperature_readings"
    __table_args__ = (UniqueConstraint("raw_ingest_log_id", "source_tag", name="uq_reading_log_source_tag"),)

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True)
    raw_ingest_log_id: Mapped[int] = mapped_column(ForeignKey("raw_ingest_logs.id"), nullable=False)
    sensor_id: Mapped[int | None] = mapped_column(ForeignKey("sensors.id"), nullable=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    source_tag: Mapped[str] = mapped_column(String(64), nullable=False)
    display_label: Mapped[str] = mapped_column(String(8), nullable=False)
    value_c = mapped_column(Numeric(7, 3), nullable=True)
    quality: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    logged_at = mapped_column(DateTime(timezone=True), nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CurrentRoomSnapshot(Base):
    __tablename__ = "current_room_snapshots"

    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), primary_key=True)
    average_c = mapped_column(Numeric(7, 3), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    sensor_fault_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_alert_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latest_log_time = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    room: Mapped[Room] = relationship()


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    sensor_id: Mapped[int | None] = mapped_column(ForeignKey("sensors.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)
    message: Mapped[str] = mapped_column(String(512), nullable=False)
    opened_at = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at = mapped_column(DateTime(timezone=True), nullable=False)


class SensorFault(Base):
    __tablename__ = "sensor_faults"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True)
    sensor_id: Mapped[int | None] = mapped_column(ForeignKey("sensors.id"), nullable=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    source_tag: Mapped[str] = mapped_column(String(64), nullable=False)
    fault_type: Mapped[str] = mapped_column(String(32), nullable=False)
    message: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)
    opened_at = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at = mapped_column(DateTime(timezone=True), nullable=False)


class IpAllowlistEntry(Base):
    __tablename__ = "ip_allowlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cidr: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scope: Mapped[str] = mapped_column(String(32), default="dashboard_access", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_matched_at = mapped_column(DateTime(timezone=True), nullable=True)


class ReportDownload(Base):
    __tablename__ = "report_downloads"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True)
    requested_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    from_at = mapped_column(DateTime(timezone=True), nullable=False)
    to_at = mapped_column(DateTime(timezone=True), nullable=False)
    room_filter = mapped_column(JSON, nullable=True)
    file_format: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="completed", nullable=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BIGINT_PK, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json = mapped_column("metadata", JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value = mapped_column(JSON, nullable=False)
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class IngestionStatus(Base):
    __tablename__ = "ingestion_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    last_success_at = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_at = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    rows_ingested: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
