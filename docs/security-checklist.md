# Security Checklist

## Implemented

- No hardcoded credentials in source.
- `.env` is ignored by Git; `.env.example` documents required variables.
- Passwords are stored as bcrypt hashes.
- Login uses CSRF token validation and rate limiting.
- Authenticated admin APIs require an admin role.
- Auth cookie is `HttpOnly`; `API_COOKIE_SECURE=true` must be enabled behind HTTPS.
- CORS is restricted with `API_ALLOWED_ORIGINS`.
- Security headers are added by API and Nginx.
- IP allowlist middleware supports separate `dashboard_access`, `admin_access`, and `api_access` scopes.
- `X-Forwarded-For` is ignored unless trusted proxy mode is enabled.
- Admin actions, login success/failure, blocked access, and report downloads are audited.
- SQL Server is not exposed publicly in Compose.

## Production Requirements

- Replace `API_SECRET_KEY` with a random value of at least 32 bytes.
- Replace `MSSQL_SA_PASSWORD`; prefer a least-privilege SQL user for API runtime.
- Set `ENVIRONMENT=production`.
- Set `API_COOKIE_SECURE=true`.
- Set `API_ALLOWED_ORIGINS=https://your-domain.example`.
- Configure HTTPS at Nginx/load balancer.
- Keep database and backups on private networks/storage.
- Grant admin access only through approved CIDR ranges.
- Rotate live API tokens and database passwords on a schedule.

## Review Before Handover

- Confirm no real secrets are committed.
- Confirm initial bootstrap admin password is changed after first login.
- Confirm IP allowlist entries match client network ranges.
- Confirm audit log retention policy with the client.
