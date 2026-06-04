from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.room_config import ROOM_GROUPS
from app.models.entities import Alert, CurrentRoomSnapshot, Room, Sensor, TemperatureReading


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def overview(self) -> dict:
        snapshot = await self.snapshot()
        return snapshot["overview"]

    async def snapshot(self) -> dict:
        rooms_result = await self.session.execute(select(Room).where(Room.is_active.is_(True)).order_by(Room.room_number))
        rooms = list(rooms_result.scalars().all())
        sensors_result = await self.session.execute(select(Sensor).where(Sensor.is_expected.is_(True), Sensor.is_active.is_(True)))
        sensors = list(sensors_result.scalars().all())
        snapshots_result = await self.session.execute(select(CurrentRoomSnapshot))
        snapshots = {item.room_id: item for item in snapshots_result.scalars().all()}
        alerts_result = await self.session.execute(select(Alert).where(Alert.status == "open"))
        alerts = list(alerts_result.scalars().all())

        latest_by_room = await self._latest_readings_by_room(rooms)
        alert_messages_by_room: dict[int, list[str]] = defaultdict(list)
        for alert in alerts:
            if alert.room_id:
                alert_messages_by_room[alert.room_id].append(alert.message)

        groups = []
        room_items_by_group: dict[str, list[dict]] = defaultdict(list)
        for room in rooms:
            snapshot = snapshots.get(room.id)
            latest_readings = latest_by_room.get(room.id, [])
            room_items_by_group[room.group_code].append(
                {
                    "room_id": room.id,
                    "room_number": room.room_number,
                    "room_name": room.name,
                    "group_code": room.group_code,
                    "average_c": float(snapshot.average_c) if snapshot and snapshot.average_c is not None else None,
                    "status": snapshot.status if snapshot else "offline",
                    "sensors": [
                        {
                            "source_tag": reading.source_tag,
                            "label": reading.display_label,
                            "value_c": float(reading.value_c) if reading.value_c is not None else None,
                            "quality": reading.quality,
                            "status": reading.status,
                        }
                        for reading in sorted(latest_readings, key=lambda item: item.display_label)
                    ],
                    "active_alerts": alert_messages_by_room.get(room.id, []),
                    "latest_log_time": snapshot.latest_log_time if snapshot else None,
                }
            )

        for group_code, room_numbers in ROOM_GROUPS:
            groups.append(
                {
                    "group_code": group_code,
                    "room_numbers": list(room_numbers),
                    "rooms": sorted(room_items_by_group[group_code], key=lambda item: item["room_number"]),
                }
            )

        current_values = [float(item.average_c) for item in snapshots.values() if item.average_c is not None]
        last_log_time = max((item.latest_log_time for item in snapshots.values() if item.latest_log_time), default=None)
        overview = {
            "total_rooms": len(rooms),
            "total_sensors": len(sensors),
            "average_c": round(sum(current_values) / len(current_values), 1) if current_values else None,
            "active_alerts": len(alerts),
            "critical_alerts": sum(1 for alert in alerts if alert.severity == "critical"),
            "warning_alerts": sum(1 for alert in alerts if alert.severity == "warning"),
            "sensor_faults": sum(item.sensor_fault_count for item in snapshots.values()),
            "last_log_time": last_log_time,
        }
        return {"overview": overview, "groups": groups}

    async def rooms(self) -> list[dict]:
        snapshot = await self.snapshot()
        return [room for group in snapshot["groups"] for room in group["rooms"]]

    async def room(self, room_id: int) -> dict | None:
        rooms = await self.rooms()
        return next((room for room in rooms if room["room_id"] == room_id or room["room_number"] == room_id), None)

    async def history(self, room_id: int, hours: int = 24, limit: int = 1000) -> list[dict]:
        room = await self.session.get(Room, room_id)
        if room is None:
            result = await self.session.execute(select(Room).where(Room.room_number == room_id))
            room = result.scalar_one_or_none()
        if room is None:
            return []
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self.session.execute(
            select(TemperatureReading)
            .where(TemperatureReading.room_id == room.id, TemperatureReading.logged_at >= since)
            .order_by(TemperatureReading.logged_at, TemperatureReading.display_label)
            .limit(limit * 5)
        )
        grouped: dict[datetime, list[TemperatureReading]] = defaultdict(list)
        for reading in result.scalars().all():
            grouped[reading.logged_at].append(reading)
        points = []
        for logged_at, readings in grouped.items():
            values = [float(reading.value_c) for reading in readings if reading.quality == "good" and reading.value_c is not None]
            points.append(
                {
                    "logged_at": logged_at,
                    "average_c": round(sum(values) / len(values), 3) if values else None,
                    "sensors": [
                        {
                            "source_tag": reading.source_tag,
                            "label": reading.display_label,
                            "value_c": float(reading.value_c) if reading.value_c is not None else None,
                            "quality": reading.quality,
                            "status": reading.status,
                        }
                        for reading in readings
                    ],
                }
            )
        return points

    async def alerts(self) -> list[Alert]:
        result = await self.session.execute(select(Alert).where(Alert.status == "open").order_by(desc(Alert.opened_at)))
        return list(result.scalars().all())

    async def _latest_readings_by_room(self, rooms: list[Room]) -> dict[int, list[TemperatureReading]]:
        output: dict[int, list[TemperatureReading]] = defaultdict(list)
        for room in rooms:
            latest_result = await self.session.execute(select(func.max(TemperatureReading.logged_at)).where(TemperatureReading.room_id == room.id))
            latest = latest_result.scalar_one_or_none()
            if latest is None:
                continue
            readings_result = await self.session.execute(
                select(TemperatureReading).where(TemperatureReading.room_id == room.id, TemperatureReading.logged_at == latest).order_by(TemperatureReading.display_label)
            )
            output[room.id] = list(readings_result.scalars().all())
        return output
