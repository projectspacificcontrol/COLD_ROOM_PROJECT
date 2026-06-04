"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

BIGINT_PK = sa.BigInteger().with_variant(sa.Integer(), "sqlite")

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("roles", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(32), nullable=False, unique=True), sa.Column("description", sa.String(255)))
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_number", sa.Integer(), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("group_code", sa.String(32), nullable=False),
        sa.Column("position_in_group", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "sensors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id"), nullable=False),
        sa.Column("display_label", sa.String(8), nullable=False),
        sa.Column("source_tag", sa.String(64), nullable=False, unique=True),
        sa.Column("position_in_room", sa.Integer(), nullable=False),
        sa.Column("is_expected", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "thresholds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scope_type", sa.String(16), nullable=False),
        sa.Column("scope_id", sa.Integer()),
        sa.Column("scope_key", sa.String(64)),
        sa.Column("normal_min_c", sa.Numeric(6, 2)),
        sa.Column("normal_max_c", sa.Numeric(6, 2)),
        sa.Column("warning_min_c", sa.Numeric(6, 2)),
        sa.Column("warning_max_c", sa.Numeric(6, 2)),
        sa.Column("critical_min_c", sa.Numeric(6, 2)),
        sa.Column("critical_max_c", sa.Numeric(6, 2)),
        sa.Column("stale_after_seconds", sa.Integer(), nullable=False, server_default="900"),
        sa.Column("fault_rules", sa.JSON()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("scope_type", "scope_id", name="uq_threshold_scope"),
    )
    op.create_table(
        "raw_ingest_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("source_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("payload_hash", sa.String(128), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="received"),
        sa.Column("error_message", sa.Text()),
        sa.UniqueConstraint("source", "source_timestamp", name="uq_raw_ingest_source_timestamp"),
    )
    op.create_table(
        "temperature_readings",
        sa.Column("id", BIGINT_PK, primary_key=True),
        sa.Column("raw_ingest_log_id", sa.Integer(), sa.ForeignKey("raw_ingest_logs.id"), nullable=False),
        sa.Column("sensor_id", sa.Integer(), sa.ForeignKey("sensors.id")),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id")),
        sa.Column("source_tag", sa.String(64), nullable=False),
        sa.Column("display_label", sa.String(8), nullable=False),
        sa.Column("value_c", sa.Numeric(7, 3)),
        sa.Column("quality", sa.String(24), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("raw_ingest_log_id", "source_tag", name="uq_reading_log_source_tag"),
    )
    op.create_index("ix_temperature_readings_logged_at", "temperature_readings", ["logged_at"])
    op.create_index("ix_temperature_readings_room_logged", "temperature_readings", ["room_id", "logged_at"])
    op.create_table(
        "current_room_snapshots",
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id"), primary_key=True),
        sa.Column("average_c", sa.Numeric(7, 3)),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("sensor_fault_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active_alert_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latest_log_time", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "alerts",
        sa.Column("id", BIGINT_PK, primary_key=True),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id")),
        sa.Column("sensor_id", sa.Integer(), sa.ForeignKey("sensors.id")),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("message", sa.String(512), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "sensor_faults",
        sa.Column("id", BIGINT_PK, primary_key=True),
        sa.Column("sensor_id", sa.Integer(), sa.ForeignKey("sensors.id")),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.id")),
        sa.Column("source_tag", sa.String(64), nullable=False),
        sa.Column("fault_type", sa.String(32), nullable=False),
        sa.Column("message", sa.String(512), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "ip_allowlist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cidr", sa.String(64), nullable=False, unique=True),
        sa.Column("label", sa.String(128)),
        sa.Column("description", sa.String(255)),
        sa.Column("scope", sa.String(32), nullable=False, server_default="dashboard_access"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_matched_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "report_downloads",
        sa.Column("id", BIGINT_PK, primary_key=True),
        sa.Column("requested_by_user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("from_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("to_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("room_filter", sa.JSON()),
        sa.Column("file_format", sa.String(16), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", BIGINT_PK, primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.String(64)),
        sa.Column("metadata", sa.JSON()),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table("system_settings", sa.Column("key", sa.String(128), primary_key=True), sa.Column("value", sa.JSON(), nullable=False), sa.Column("is_secret", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_table(
        "ingestion_status",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(64), nullable=False, unique=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True)),
        sa.Column("last_error_at", sa.DateTime(timezone=True)),
        sa.Column("last_error", sa.Text()),
        sa.Column("rows_ingested", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("ingestion_status")
    op.drop_table("system_settings")
    op.drop_table("audit_logs")
    op.drop_table("report_downloads")
    op.drop_table("ip_allowlist")
    op.drop_table("sensor_faults")
    op.drop_table("alerts")
    op.drop_table("current_room_snapshots")
    op.drop_index("ix_temperature_readings_room_logged", table_name="temperature_readings")
    op.drop_index("ix_temperature_readings_logged_at", table_name="temperature_readings")
    op.drop_table("temperature_readings")
    op.drop_table("raw_ingest_logs")
    op.drop_table("thresholds")
    op.drop_table("sensors")
    op.drop_table("rooms")
    op.drop_table("users")
    op.drop_table("roles")
