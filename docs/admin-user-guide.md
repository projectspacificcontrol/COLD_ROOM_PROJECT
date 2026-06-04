# Admin User Guide

## Login

Open `/admin/login` and sign in with the seeded admin account. The first admin can be created by setting `API_BOOTSTRAP_ADMIN_EMAIL` and `API_BOOTSTRAP_ADMIN_PASSWORD`, then running:

```bash
python -m app.scripts.seed
```

Change the bootstrap password after first login.

## Dashboard

The admin home page shows live ingestion status, last successful fetch time, online/offline room counts, active alerts, sensor faults, API source health, database health, and recent admin actions.

## Users

Use `/admin/users` to add, edit, deactivate, or remove users. Password updates are hashed by the backend.

## IP Allowlist

Use `/admin/ip-allowlist` to add CIDR entries. Scopes:

- `dashboard_access` - main room dashboard and live updates
- `admin_access` - login and admin panel APIs
- `api_access` - general API access

Each entry supports label, description, enabled flag, creator, created time, and last matched time.

## Thresholds

Use `/admin/thresholds` for global, group, room, and sensor threshold rules. Priority is:

1. sensor
2. room
3. group
4. global

Threshold updates affect future ingestion and dashboard status calculations.

## Reports

Use `/admin/reports` to download Excel reports for predefined durations or custom date ranges. Exports include Summary, Room Latest Snapshot, Temperature Readings, Alerts, Sensor Faults, and Metadata.

Large exports are capped by `API_REPORT_MAX_ROWS`.

## System Health And Audit Logs

Use `/admin/system-health` for ingestion and data-source health. Use `/admin/audit-logs` to review login events, admin changes, report downloads, and blocked access attempts.
