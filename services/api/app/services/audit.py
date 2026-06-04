from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import AuditLog, User


async def write_audit(
    session: AsyncSession,
    user: User | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    session.add(
        AuditLog(
            actor_user_id=user.id if user else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata,
            ip_address=ip_address,
        )
    )

