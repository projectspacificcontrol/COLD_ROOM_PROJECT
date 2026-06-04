from secrets import token_urlsafe

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_session
from app.models.entities import User

CSRF_COOKIE = "cold_room_csrf"
SESSION_COOKIE = "cold_room_session"


def ensure_csrf_cookie(request: Request, response: Response) -> str:
    csrf = request.cookies.get(CSRF_COOKIE) or token_urlsafe(32)
    response.set_cookie(CSRF_COOKIE, csrf, httponly=False, secure=settings.api_cookie_secure, samesite="strict")
    return csrf


def require_csrf(request: Request) -> None:
    cookie_token = request.cookies.get(CSRF_COOKIE)
    header_token = request.headers.get("x-csrf-token")
    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token mismatch")


async def current_user(request: Request, session: AsyncSession = Depends(get_session)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    result = await session.execute(select(User).options(selectinload(User.role)).where(User.email == payload["sub"], User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


async def admin_user(user: User = Depends(current_user)) -> User:
    if user.role.name not in {"admin", "operator"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
