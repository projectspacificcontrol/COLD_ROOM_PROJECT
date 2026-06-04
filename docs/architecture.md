# Architecture

## System Shape

The repository is split by deployable boundary:

- `apps/web`: React dashboard and admin UI.
- `services/api`: FastAPI API, ingestion, normalization, reports, auth, live updates.
- `infra`: Docker Compose and reverse-proxy configuration.
- `docs`: operational and handover documentation.

The backend owns the source-of-truth room mapping. The frontend keeps an equivalent typed display config only for fixture rendering and predictable UI labels.

## Data Flow

1. Live source or Excel upload provides wide records shaped like `LogTime`, `CR123_TT01`, `CR123_TT02`, etc.
2. `services/api/app/services/normalizer.py` expands every record into 90 expected sensor slots.
3. Missing columns become `quality=unavailable` and `status=fault`.
4. API snapshots aggregate readings by group and room from `current_room_snapshots` and latest readings.
5. Web dashboard consumes `/api/dashboard/summary` or the compatibility `/api/v1/dashboard/summary`; live updates stream from `/api/live`.
6. Admin APIs manage users, IP allowlists, thresholds, reports, alerts, system health, audit logs, and settings.

## Runtime Components

- Web: static React production build served by Nginx.
- API: FastAPI service with SQLAlchemy async sessions.
- Database: Microsoft SQL Server in production; SQLite only for local/CI fallback.
- Edge: Nginx terminates HTTPS and proxies `/api` to FastAPI.
- Live updates: Server-Sent Events with safe frontend polling fallback.
- Monitoring: `/api/health`, `/api/ready`, `/api/metrics`, structured JSON logs, and admin system health view.

## Room Mapping

| Group | Rooms |
| --- | --- |
| CR123 | 1, 2, 3 |
| CR456 | 4, 5, 6 |
| CR789 | 7, 8, 9 |
| CR101112 | 10, 11, 12 |
| CR131415 | 13, 14, 15 |
| CR161718 | 16, 17, 18 |

Within each group:

- `TT01` to `TT05`: first room, displayed `T1` to `T5`
- `TT06` to `TT10`: second room, displayed `T1` to `T5`
- `TT11` to `TT15`: third room, displayed `T1` to `T5`

## Workbook Inspection

`dbo.COLD_ROOM_TEMP.xlsx` has `LogTime` plus 85 sensors. It is missing `CR161718_TT11` through `CR161718_TT15`. The scaffold intentionally handles this as unavailable sensors for room 18 rather than an ingestion failure.
