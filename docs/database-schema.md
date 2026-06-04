# Database Schema

The backend uses SQLAlchemy models and Alembic migrations. Production targets Microsoft SQL Server; SQLite is supported for local development and CI.

## Core Tables

- `roles` - admin/operator/viewer role records.
- `users` - admin users with bcrypt password hashes only.
- `rooms` - 18 cold rooms with room number, name, group code, and active flag.
- `sensors` - 90 expected sensors, mapped from source tags such as `CR123_TT01` to display labels `T1`-`T5`.
- `thresholds` - global/group/room/sensor threshold overrides and stale/fault rules.
- `raw_ingest_logs` - normalized source payload envelope and dedupe hash.
- `temperature_readings` - time-series sensor readings with room, sensor, quality, status, and logged time.
- `current_room_snapshots` - latest room average, status, alert count, and fault count for dashboard speed.
- `alerts` - active/resolved warning and critical conditions.
- `sensor_faults` - missing, stale, unavailable, or invalid sensor data records.
- `ip_allowlist` - CIDR entries scoped to dashboard, admin, or API access.
- `report_downloads` - report audit metadata.
- `audit_logs` - login, admin changes, blocked access, and report download audit records.
- `system_settings` - database-managed operational settings.
- `ingestion_status` - last success/error status by data source.

## Important Indexes

- `temperature_readings.logged_at`
- `temperature_readings.room_id, logged_at`
- unique `raw_ingest_logs.source, source_timestamp`
- unique `temperature_readings.raw_ingest_log_id, source_tag`

These support dashboard history, report export, and ingestion deduplication.

## Room And Sensor Mapping

- `CR123` -> rooms 1, 2, 3
- `CR456` -> rooms 4, 5, 6
- `CR789` -> rooms 7, 8, 9
- `CR101112` -> rooms 10, 11, 12
- `CR131415` -> rooms 13, 14, 15
- `CR161718` -> rooms 16, 17, 18

For each group:

- `TT01`-`TT05` -> first room, displayed as `T1`-`T5`
- `TT06`-`TT10` -> second room, displayed as `T1`-`T5`
- `TT11`-`TT15` -> third room, displayed as `T1`-`T5`
