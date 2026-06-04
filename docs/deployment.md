# Deployment

## Local Development

### Option A: one command on Windows

```powershell
Copy-Item .env.example .env
# For no external DB, set DATABASE_URL=sqlite+aiosqlite:///./local.db in .env.
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

The script runs Alembic migrations, seeds roles/rooms/sensors/thresholds/bootstrap admin, then starts:

- API: `http://localhost:8000`
- Web: `http://localhost:5173`

### Option B: Docker Compose with SQL Server

```powershell
Copy-Item .env.example .env
docker compose -f infra/docker-compose.yml --env-file .env up --build
```

Local Compose starts SQL Server on an internal network, the FastAPI service, the Vite service, and Nginx on `http://localhost:8080`.

## Production Compose

```bash
cp .env.example .env
# Replace all secrets and production URLs.
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

Production Compose uses:

- `services/api/Dockerfile.prod`
- `apps/web/Dockerfile.prod`
- `infra/nginx/nginx.prod.conf`
- private SQL Server network
- restart policies
- `migrate` and `seed` one-shot services
- `/api/ready` API healthcheck

## HTTPS/TLS

Place certificates at:

```text
infra/certs/fullchain.pem
infra/certs/privkey.pem
```

For a VM, use Certbot or a cloud certificate service. Point DNS `A`/`AAAA` records to the VM/load balancer, issue the certificate, then restart Nginx.

Production environment requirements:

```env
ENVIRONMENT=production
API_COOKIE_SECURE=true
API_ALLOWED_ORIGINS=https://your-domain.example
VITE_API_BASE_URL=/api
VITE_USE_FIXTURES=false
API_TRUSTED_PROXY_ENABLED=true
API_TRUSTED_PROXY_CIDRS=<proxy-subnet-only>
```

Do not enable trusted proxy mode unless Nginx/load balancer IP ranges are controlled by you.

## Migration And Seed

Production migration:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm migrate
```

Seed roles, rooms, sensors, global thresholds, and optional bootstrap admin:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm seed
```

## Logs

API logs are structured JSON on stdout/stderr for Docker, cloud log agents, or journald. Recommended retention:

- keep 14-30 days of application logs
- rotate host/container logs daily
- avoid logging live API credentials, passwords, or full report contents

## Health And Monitoring

- `GET /api/health` - process is alive
- `GET /api/ready` - database connectivity check
- `GET /api/metrics` - Prometheus text metrics for active alerts and sensor faults
- Admin page `/admin/system-health` - ingestion status, API source health, DB health

Prometheus can scrape `https://your-domain.example/api/metrics`. Grafana panels should track active alerts, sensor faults, API readiness, ingestion last success time, and container CPU/memory.

## Upgrade Process

1. Back up SQL Server.
2. Pull the release artifact or Git tag.
3. Review `.env.example` for new required variables.
4. Build new images.
5. Run migrations.
6. Restart API/web/Nginx.
7. Verify `/api/ready`, dashboard, admin login, and report export.

## Rollback Process

1. Stop the new Compose deployment.
2. Restore the previous image tag or Git tag.
3. Restore database backup if a migration is not backward-compatible.
4. Start Compose and verify `/api/ready`.

## Database Exposure

Do not publish SQL Server to the internet. In provided Compose files, the DB only joins `cold_room_internal`. If using managed SQL Server, restrict inbound network rules to the API runtime only.
