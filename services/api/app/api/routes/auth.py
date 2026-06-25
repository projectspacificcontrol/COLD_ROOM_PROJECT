from secrets import token_urlsafe
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CSRF_COOKIE, SESSION_COOKIE, current_user, ensure_csrf_cookie, require_csrf
from app.core.config import settings
from app.core.security import client_ip, create_access_token, verify_password
from app.db.session import get_session
from app.models.entities import User
from app.schemas.admin import LoginRequest, MeOut
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])
# Per-IP burst limiter (short window) and per-account failed-attempt lockout.
_login_hits: dict[str, list[datetime]] = {}
_failed_logins: dict[str, list[datetime]] = {}
_login_lockouts: dict[str, datetime] = {}


def _lockout_key(email: str) -> str:
    return email.strip().lower()


@router.get("/csrf")
async def csrf(request: Request, response: Response) -> dict[str, str]:
    return {"csrf_token": ensure_csrf_cookie(request, response)}


@router.post("/login", dependencies=[Depends(require_csrf)])
async def login(payload: LoginRequest, request: Request, response: Response, session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    ip = client_ip(request)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=1)
    hits = [hit for hit in _login_hits.get(ip, []) if hit > window_start]
    if len(hits) >= settings.api_login_rate_limit_per_minute:
        await write_audit(session, None, "login_rate_limited", "auth", None, {"email": payload.email}, ip)
        await session.commit()
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts")
    hits.append(now)
    _login_hits[ip] = hits

    # Per-account lockout: after N failed attempts, refuse logins for a cool-down
    # window. Applies to every login (dashboard and admin share this endpoint).
    key = _lockout_key(payload.email)
    locked_until = _login_lockouts.get(key)
    if locked_until and locked_until > now:
        remaining = max(1, int((locked_until - now).total_seconds() // 60) + 1)
        await write_audit(session, None, "login_locked", "auth", None, {"email": payload.email}, ip)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {remaining} minute(s).",
        )
    if locked_until:
        # Cool-down elapsed — clear the lockout and start fresh.
        _login_lockouts.pop(key, None)
        _failed_logins.pop(key, None)

    result = await session.execute(select(User).options(selectinload(User.role)).where(User.email == payload.email, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        lock_window_start = now - timedelta(minutes=settings.api_login_lockout_minutes)
        failures = [hit for hit in _failed_logins.get(key, []) if hit > lock_window_start]
        failures.append(now)
        _failed_logins[key] = failures
        await write_audit(session, user, "login_failure", "auth", None, {"email": payload.email, "attempt": len(failures)}, ip)
        if len(failures) >= settings.api_login_max_failed_attempts:
            _login_lockouts[key] = now + timedelta(minutes=settings.api_login_lockout_minutes)
            _failed_logins.pop(key, None)
            await write_audit(session, user, "login_locked", "auth", None, {"email": payload.email}, ip)
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Account locked for {settings.api_login_lockout_minutes} minutes.",
            )
        await session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Successful login clears any failed-attempt history for this account.
    _failed_logins.pop(key, None)
    _login_lockouts.pop(key, None)

    access_token = create_access_token(user.email, user.role.name)
    response.set_cookie(
        SESSION_COOKIE,
        access_token,
        httponly=True,
        secure=settings.api_cookie_secure,
        samesite="strict",
        max_age=1800,
    )
    await write_audit(session, user, "login_success", "auth", str(user.id), None, ip)
    await session.commit()
    return {"status": "ok"}


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(current_user)) -> dict:
    return {"id": user.id, "email": user.email, "role": user.role.name}


@router.post("/logout", dependencies=[Depends(require_csrf)])
async def logout(response: Response, request: Request, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    response.delete_cookie(SESSION_COOKIE)
    response.delete_cookie(CSRF_COOKIE)
    await write_audit(session, user, "logout", "auth", str(user.id), None, client_ip(request))
    await session.commit()
    return {"status": "ok"}


@router.get("/bootstrap-token")
async def bootstrap_token() -> dict[str, str]:
    if settings.environment == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return {"csrf_token": token_urlsafe(32)}
