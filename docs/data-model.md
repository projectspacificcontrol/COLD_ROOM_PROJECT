# Data Model

## Normalized Tables

- `roles`: admin, operator, and viewer roles.
- `users`: admin/operator/viewer identities.
- `rooms`: 18 rooms with group membership and position.
- `sensors`: 90 expected sensor slots with source tags and room labels.
- `raw_ingest_logs`: one source record ingestion event per `LogTime`.
- `temperature_readings`: one normalized reading per expected sensor per batch.
- `current_room_snapshots`: latest room average/status/fault summary.
- `thresholds`: global, group, room, or sensor threshold overrides.
- `alerts`: active and historical warning/critical/fault events.
- `sensor_faults`: active and resolved sensor quality/staleness faults.
- `ip_allowlist`: database-managed allowlist entries.
- `report_downloads`: export audit trail.
- `audit_logs`: admin action trail.
- `ingestion_status`: source health and last ingestion state.
- `system_settings`: admin-managed operational settings.

## Reading Quality

- `good`: value parsed successfully.
- `missing`: empty value in an existing source column.
- `invalid`: non-numeric value in an existing source column.
- `unavailable`: expected source column absent from API/workbook payload.

## Status

Runtime thresholds are loaded from the `thresholds` table. The seed script creates development defaults only outside production.
