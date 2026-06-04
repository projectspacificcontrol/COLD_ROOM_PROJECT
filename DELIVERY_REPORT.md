# Delivery Report

## Completed Features

- Dynamic 18-room, 90-sensor dashboard with group and sensor mapping.
- Missing sensor handling with unavailable/fault state.
- Secure admin login, logout, current-user endpoint, RBAC checks, bcrypt password hashes, CSRF, rate limiting, and audit logs.
- Admin management for users, IP allowlist, thresholds, reports, alerts, system health, audit logs, and settings.
- SQLAlchemy/Alembic schema for SQL Server with SQLite developer fallback.
- Excel/API-shaped ingestion and Excel report export.
- SSE live updates and frontend polling fallback.
- Docker local and production deployment files.
- Nginx reverse proxy configs for local and HTTPS production.
- CI workflow for backend, frontend, Docker build, and e2e.
- Production docs, security checklist, backup/restore, troubleshooting, and client handover material.

## Setup Steps

```powershell
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

For Docker SQL Server:

```powershell
docker compose -f infra/docker-compose.yml --env-file .env up --build
```

## Production Deployment

```bash
cp .env.example .env
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm migrate
docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm seed
```

## Environment Variables

Required: `API_SECRET_KEY`, `API_ALLOWED_ORIGINS`, `DATABASE_URL`, `MSSQL_DATABASE`, `MSSQL_SA_PASSWORD`, `API_BOOTSTRAP_ADMIN_EMAIL`, `API_BOOTSTRAP_ADMIN_PASSWORD`.

Live API: `API_DATA_PROVIDER=http_live_api`, `API_LIVE_SOURCE_URL`, `API_LIVE_SOURCE_TOKEN`, `API_POLL_INTERVAL_SECONDS`.

Security: `API_COOKIE_SECURE`, `API_TRUSTED_PROXY_ENABLED`, `API_TRUSTED_PROXY_CIDRS`, `API_IP_ALLOWLIST`, `API_REPORT_MAX_ROWS`.

## Test Results

Verified on this workstation on 2026-06-04:

- Backend: `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest tests` -> 13 passed.
- Backend syntax: `python -m compileall -q app tests` -> passed.
- Frontend typecheck/lint: `npm run lint` -> passed.
- Frontend unit tests: `npm test` -> 2 files, 5 tests passed.
- Frontend production build: `npm run build` -> passed; Vite reports one chunk above 500 kB.
- Playwright e2e: `npm run e2e -- --project=chromium` -> 2 passed.
- Docker build check: not run locally because Docker is not installed on this workstation; covered by `.github/workflows/ci.yml`.

Release verification commands:

```powershell
cd services/api; python -m pytest tests
cd apps/web; npm run lint; npm test; npm run build; npm run e2e
```

Record CI output in the release notes for the exact deployment build.

## Security Controls

- hashed passwords only
- HttpOnly session cookie
- CSRF on state-changing admin/auth operations
- rate-limited login
- CORS allowlist
- IP allowlist middleware
- no trusted forwarded IP unless configured
- structured audit logs
- secure headers
- private database network

## Known Assumptions

- SQL Server is the production database.
- SQLite is only a local no-database fallback.
- Real live API rows match the uploaded Excel shape.
- HTTPS terminates at Nginx or a managed cloud load balancer.

## External Dependencies

- Microsoft SQL Server or compatible managed SQL Server.
- Microsoft ODBC Driver 18 for non-Docker API hosts.
- Live API provider endpoint and token.
- TLS certificate authority or managed certificate service.

## Real Live API

Set `API_DATA_PROVIDER=http_live_api`, configure URL/token, and restart the API. The ingestion loop polls by `API_POLL_INTERVAL_SECONDS`.

## First Admin User

Set bootstrap admin env variables and run `python -m app.scripts.seed`. Rotate the password after first login.

## IP Allowlist

Use `/admin/ip-allowlist` to add client CIDR ranges by scope. Start with the admin network, verify login, then restrict dashboard/API scopes.

## Reports

Use `/admin/reports`; exports contain Summary, Room Latest Snapshot, Temperature Readings, Alerts, Sensor Faults, and Metadata.

## Maintenance Checklist

- verify `/api/ready` daily
- monitor ingestion last success time
- review open alerts/faults
- review audit logs weekly
- test backups monthly
- rotate API/database secrets per policy
- apply OS, Docker, Python, and npm security updates
