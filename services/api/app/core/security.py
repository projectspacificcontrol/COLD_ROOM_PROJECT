from datetime import datetime, timedelta, timezone
from ipaddress import ip_address, ip_network
from typing import Callable

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject: str, role: str, minutes: int = 30) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "role": role, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, settings.api_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.api_secret_key, algorithms=[ALGORITHM])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session") from exc


def client_ip(request: Request) -> str:
    if settings.api_trusted_proxy_enabled:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class IpAllowlistMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        allowlist = list(settings.ip_allowlist)
        route_scope = self._scope_for_path(request.url.path)
        matched_entry_id: int | None = None
        try:
            from app.db.session import AsyncSessionLocal
            from app.models.entities import AuditLog, IpAllowlistEntry

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(IpAllowlistEntry).where(
                        IpAllowlistEntry.is_active.is_(True),
                        IpAllowlistEntry.scope.in_([route_scope, "api_access"]),
                    )
                )
                entries = list(result.scalars().all())
                allowlist.extend(entry.cidr for entry in entries)

                if allowlist:
                    try:
                        ip = ip_address(client_ip(request))
                    except ValueError:
                        session.add(AuditLog(action="blocked_access", resource_type=route_scope, metadata_json={"reason": "invalid_ip"}, ip_address=None))
                        await session.commit()
                        return JSONResponse({"detail": "Invalid client IP"}, status_code=status.HTTP_403_FORBIDDEN)
                    for entry in entries:
                        if ip in ip_network(entry.cidr, strict=False):
                            matched_entry_id = entry.id
                            entry.last_matched_at = datetime.now(timezone.utc)
                            break
                    if matched_entry_id is None and not any(ip in ip_network(cidr, strict=False) for cidr in settings.ip_allowlist):
                        session.add(AuditLog(action="blocked_access", resource_type=route_scope, metadata_json={"path": request.url.path}, ip_address=str(ip)))
                        await session.commit()
                        return JSONResponse({"detail": "IP address is not allowed"}, status_code=status.HTTP_403_FORBIDDEN)
                    await session.commit()
        except SQLAlchemyError:
            allowlist = list(settings.ip_allowlist)

        if not allowlist:
            return await call_next(request)
        try:
            ip = ip_address(client_ip(request))
        except ValueError as exc:
            return JSONResponse({"detail": "Invalid client IP"}, status_code=status.HTTP_403_FORBIDDEN)
        allowed = any(ip in ip_network(cidr, strict=False) for cidr in allowlist)
        if not allowed:
            return JSONResponse({"detail": "IP address is not allowed"}, status_code=status.HTTP_403_FORBIDDEN)
        return await call_next(request)

    @staticmethod
    def _scope_for_path(path: str) -> str:
        if path.startswith("/api/admin") or path.startswith("/api/v1/admin") or path.startswith("/api/auth") or path.startswith("/api/v1/auth"):
            return "admin_access"
        if path.startswith("/api/dashboard") or path.startswith("/api/v1/dashboard") or path.startswith("/api/live") or path.startswith("/api/v1/live"):
            return "dashboard_access"
        return "api_access"


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, list[datetime]] = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        now = datetime.now(timezone.utc)
        ip = client_ip(request)
        window_start = now - timedelta(minutes=1)
        hits = [hit for hit in self._hits.get(ip, []) if hit > window_start]
        if len(hits) >= settings.api_rate_limit_per_minute:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
        hits.append(now)
        self._hits[ip] = hits
        return await call_next(request)
