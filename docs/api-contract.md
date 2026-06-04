# API Contract

Primary base path: `/api`

Compatibility base path: `/api/v1`

OpenAPI docs are available at `/docs` outside production. In production they are disabled unless `API_OPENAPI_ENABLED_IN_PRODUCTION=true`.

## Dashboard

- `GET /api/health`
- `GET /api/ready`
- `GET /api/metrics`
- `GET /api/dashboard/overview`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/rooms`
- `GET /api/dashboard/rooms/{room_id}`
- `GET /api/dashboard/rooms/{room_id}/history?hours=24&limit=1000`
- `GET /api/dashboard/alerts`
- `GET /api/live`

`/api/live` is a Server-Sent Events stream that emits `dashboard.snapshot`.

`/api/metrics` returns Prometheus-compatible text metrics for active alerts and sensor faults.

## Ingestion

- `POST /api/ingest/records`
- `POST /api/ingest/excel`
- `POST /api/ingest/poll-now`

Ingestion is idempotent by `source` plus `LogTime`. Missing expected sensors are stored as unavailable/faulted readings.

## Auth

- `GET /api/auth/csrf`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Admin write endpoints require an authenticated HttpOnly session cookie plus `X-CSRF-Token`.

## Admin

- `GET/POST/PUT/DELETE /api/admin/users`
- `GET/POST/PUT/DELETE /api/admin/ip-allowlist`
- `GET/POST/PUT/DELETE /api/admin/thresholds`
- `GET /api/admin/thresholds/effective?room_id=&sensor_id=`
- `GET /api/admin/overview`
- `GET /api/admin/rooms`
- `GET /api/admin/alerts`
- `GET /api/admin/sensor-faults`
- `GET /api/admin/system-health`
- `GET /api/admin/audit-logs`
- `GET /api/admin/reports/export?duration=1h|8h|24h|7d|30d&rooms=1,2,3&groups=CR123&include_alerts=true&include_faults=true&format=xlsx`
- `GET /api/admin/reports/export?from={iso}&to={iso}&rooms=1,2,3&groups=CR123&include_alerts=true&include_faults=true&format=xlsx`
- `GET /api/admin/settings`
- `PUT /api/admin/settings/{key}`

Excel exports include `Summary`, `Room Latest Snapshot`, `Temperature Readings`, `Alerts`, `Sensor Faults`, and `Metadata` sheets.
