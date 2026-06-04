# Security Model

This file is kept as a short overview. Use `docs/security-checklist.md` for the deployment checklist.

## Controls

- Secrets are environment variables or database-admin settings, never source constants.
- Passwords are hashed using bcrypt.
- Session tokens are stored in HttpOnly cookies.
- CSRF token validation is required for cookie-authenticated state changes.
- Admin APIs require an active admin user.
- Login and API requests are rate limited.
- CORS is restricted to `API_ALLOWED_ORIGINS`.
- IP allowlist middleware enforces dashboard/admin/API scopes.
- `X-Forwarded-For` is ignored unless trusted proxy mode is enabled.
- Security headers are applied by API and Nginx.
- SQL Server is private to the application network.
- Audit logs record login success/failure, admin changes, blocked access, and report downloads.

## Production Notes

- Enable HTTPS and set `API_COOKIE_SECURE=true`.
- Use a secret manager for `API_SECRET_KEY`, SQL credentials, and live API tokens.
- Prefer gateway or Redis-backed distributed rate limiting for multi-instance deployments.
- Restrict admin allowlist CIDRs before client go-live.
