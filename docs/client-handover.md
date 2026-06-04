# Client Handover

## Delivered System

- Dynamic 18-room cold room dashboard.
- Admin panel for users, thresholds, IP allowlist, reports, alerts, system health, audit logs, and settings.
- SQL-backed normalized temperature readings.
- Excel/API-shaped ingestion pipeline.
- SSE live updates with polling fallback in the web client.
- Excel report export.
- Docker and production deployment files.
- CI workflow for backend, frontend, Docker, and e2e checks.

## Client Inputs Needed

- Production domain.
- Approved dashboard/admin IP ranges.
- Production SQL Server endpoint or approval to run SQL Server container.
- Real live API URL, token, auth method, and polling interval.
- TLS certificate strategy.
- Backup retention requirements.
- Admin user list and roles.

## Connecting The Real Live API

Set:

```env
API_DATA_PROVIDER=http_live_api
API_LIVE_SOURCE_URL=https://provider.example/api/temperature
API_LIVE_SOURCE_TOKEN=<secret-token>
API_POLL_INTERVAL_SECONDS=60
```

The provider accepts a single JSON row, an array of rows, or an object with a `data` array. Each row should match the Excel shape with `LogTime` plus sensor columns.

## First Admin

Set `API_BOOTSTRAP_ADMIN_EMAIL` and `API_BOOTSTRAP_ADMIN_PASSWORD`, run the seed command, log in, then rotate the password.

## Handover Verification

- `/api/ready` returns ready.
- Dashboard shows 18 rooms.
- A missing sensor appears unavailable/faulted.
- Admin login works.
- IP allowlist blocks a test unapproved address.
- Excel report download opens in Excel.
- Audit logs show admin actions.
