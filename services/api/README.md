# Cold Room Monitoring API

FastAPI backend for cold room temperature monitoring.

## Setup

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

Set environment variables using the root `.env.example` as a template. Do not commit real secrets.

This backend is configured for Microsoft SQL Server via `mssql+aioodbc`. Install Microsoft ODBC Driver 18 when running outside Docker.

## Database

```powershell
alembic upgrade head
python -m app.scripts.seed
```

The seed script creates:

- Roles: `admin`, `operator`, `viewer`
- 18 rooms
- 90 expected sensors
- Development global thresholds when not in production
- Optional bootstrap admin only when `API_BOOTSTRAP_ADMIN_EMAIL` and `API_BOOTSTRAP_ADMIN_PASSWORD` are set

## Run

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

OpenAPI is available at `/docs` outside production. In production it is disabled unless `API_OPENAPI_ENABLED_IN_PRODUCTION=true`.

## Providers

- `ExcelFixtureProvider`: reads the uploaded Excel-like fixture shape.
- `HttpLiveApiProvider`: polls the production HTTP API using `API_LIVE_SOURCE_URL` and optional bearer token.

Use `POST /api/ingest/poll-now` for an authenticated manual poll.
