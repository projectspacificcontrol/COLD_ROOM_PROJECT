import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.room_config import ROOM_GROUPS, expected_sensor_mappings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.entities import Role, Room, Sensor, Threshold, User


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for name, description in (
            ("admin", "Full administrative access"),
            ("operator", "Operational administration without ownership changes"),
            ("viewer", "Read-only dashboard access"),
        ):
            exists = (await session.execute(select(Role).where(Role.name == name))).scalar_one_or_none()
            if exists is None:
                session.add(Role(name=name, description=description))
        await session.flush()

        rooms_by_number: dict[int, Room] = {}
        for group_code, room_numbers in ROOM_GROUPS:
            for position, room_number in enumerate(room_numbers, start=1):
                room = (await session.execute(select(Room).where(Room.room_number == room_number))).scalar_one_or_none()
                if room is None:
                    room = Room(room_number=room_number, name=f"Cold Room {room_number}", group_code=group_code, position_in_group=position)
                    session.add(room)
                    await session.flush()
                rooms_by_number[room_number] = room

        for mapping in expected_sensor_mappings():
            exists = (await session.execute(select(Sensor).where(Sensor.source_tag == mapping.source_tag))).scalar_one_or_none()
            if exists is None:
                session.add(
                    Sensor(
                        room_id=rooms_by_number[mapping.room_number].id,
                        display_label=mapping.display_label,
                        source_tag=mapping.source_tag,
                        position_in_room=mapping.position_in_room,
                    )
                )

        global_threshold = (await session.execute(select(Threshold).where(Threshold.scope_type == "global", Threshold.scope_id.is_(None)))).scalar_one_or_none()
        if global_threshold is None and settings.environment != "production":
            session.add(Threshold(scope_type="global", warning_max_c=5.5, critical_max_c=7.0, stale_after_seconds=900))

        if settings.api_bootstrap_admin_email and settings.api_bootstrap_admin_password:
            admin_role = (await session.execute(select(Role).where(Role.name == "admin"))).scalar_one()
            admin = (await session.execute(select(User).where(User.email == settings.api_bootstrap_admin_email))).scalar_one_or_none()
            if admin is None:
                session.add(
                    User(
                        email=settings.api_bootstrap_admin_email,
                        password_hash=hash_password(settings.api_bootstrap_admin_password),
                        role_id=admin_role.id,
                        is_active=True,
                    )
                )

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
