# Troubleshooting

## Backend says `No module named app`

Run Uvicorn from `services/api`:

```powershell
cd services/api
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Or use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

## Port 8000 is forbidden or already in use

Windows may reserve or block a port. Try:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Then set `VITE_API_BASE_URL=http://localhost:8001/api` before starting the frontend.

## Admin cannot sign in

Check:

- backend is running
- `/api/health` returns `{"status":"ok"}`
- `.env` has `API_BOOTSTRAP_ADMIN_EMAIL` and `API_BOOTSTRAP_ADMIN_PASSWORD`
- seed command ran successfully
- frontend `VITE_API_BASE_URL` points to the backend
- browser devtools Network tab for the login response

## SQL Server connection fails

Check:

- ODBC Driver 18 is installed on non-Docker hosts
- `DATABASE_URL` includes the correct driver name
- database exists
- SQL user has permissions
- firewall allows API host to reach SQL Server

## IP allowlist blocks everyone

If behind Nginx/load balancer, only enable `API_TRUSTED_PROXY_ENABLED=true` after setting `API_TRUSTED_PROXY_CIDRS` to the proxy network. Add a temporary admin CIDR directly from a trusted console if needed.

## Reports fail with range limit

Reduce the date range or raise `API_REPORT_MAX_ROWS` after confirming memory capacity. For very large exports, run reports as a background job.
