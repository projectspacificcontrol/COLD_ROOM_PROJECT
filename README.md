# Cold Room Temperature Monitoring

Production-ready cold room monitoring monorepo for 18 rooms, 6 CR groups, and 90 expected temperature sensors.

## Applications

- `apps/web` - React, TypeScript, Vite, Tailwind dashboard and admin panel.
- `services/api` - FastAPI backend with SQLAlchemy, Alembic, auth, ingestion, reports, live updates, and admin APIs.
- `infra` - Docker Compose, SQL Server, and Nginx deployment files.
- `docs` - architecture, operations, security, handover, and troubleshooting guides.

## Local Start Without Docker

Use this when you do not have a SQL Server URL yet. Set `DATABASE_URL=sqlite+aiosqlite:///./local.db` in `.env`.

```powershell
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Open:

- Dashboard: `http://localhost:5173`
- Admin: `http://localhost:5173/admin/login`
- API health: `http://localhost:8000/api/health`
- API readiness: `http://localhost:8000/api/ready`

Stop both servers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1
```

## Local Start With Docker Compose

```powershell
Copy-Item .env.example .env
# Edit .env and replace API_SECRET_KEY, MSSQL_SA_PASSWORD, admin bootstrap values.
docker compose -f infra/docker-compose.yml --env-file .env up --build
```

The database is private to Docker networking. Only the API, web dev server, and Nginx edge proxy are exposed locally.

## Common Commands

Backend:

```powershell
cd services/api
python -m alembic upgrade head
python -m app.scripts.seed
python -m pytest tests
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd apps/web
npm install
npm run lint
npm test
npm run build
npm run e2e
```

## SQL Database

Production is configured for Microsoft SQL Server through the async `mssql+aioodbc` SQLAlchemy dialect. SQLite is supported only as a developer fallback.

Example SQL Server URL:

```env
DATABASE_URL=mssql+aioodbc://user:password@server-host:1433/cold_room?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes
```

## Fixture Mode

The backend fixture provider reads the uploaded Excel/API-shaped data from `API_FIXTURE_EXCEL_PATH`. The normalizer always creates the full 18-room/90-sensor expected shape; missing sensors become unavailable/faulted readings instead of crashing the dashboard.

## Documentation

- [Architecture](docs/architecture.md)
- [API Contract](docs/api-contract.md)
- [Database Schema](docs/database-schema.md)
- [Deployment](docs/deployment.md)
- [Security Checklist](docs/security-checklist.md)
- [Admin User Guide](docs/admin-user-guide.md)
- [Backup and Restore](docs/backup-restore.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Client Handover](docs/client-handover.md)
- [Delivery Report](DELIVERY_REPORT.md)
