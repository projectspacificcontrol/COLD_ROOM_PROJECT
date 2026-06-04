import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.room_config import EXPECTED_BY_TAG
from app.models.entities import (
    Alert,
    CurrentRoomSnapshot,
    IngestionStatus,
    RawIngestLog,
    Room,
    Sensor,
    SensorFault,
    TemperatureReading,
    Threshold,
)
from app.services.normalizer import normalize_record
from app.services.status import DEV_DEFAULT_THRESHOLDS, ThresholdConfig, room_average, room_status


def _json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def payload_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(_json_safe(payload), sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class IngestionService:
    def __init__(self, session: AsyncSession, source: str = "external_api"):
        self.session = session
        self.source = source

    async def ingest_records(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        rows_inserted = 0
        readings_normalized = 0
        missing_expected: set[str] = set()
        try:
            sensor_by_tag = await self._sensor_by_tag()
            room_by_number = await self._room_by_number()
            thresholds = await self._thresholds_by_tag(sensor_by_tag, room_by_number)
            for record in records:
                normalized = normalize_record(record, thresholds)
                missing_expected.update(normalized["missing_expected_sensors"])
                existing = await self._existing_raw_log(normalized["logged_at"])
                if existing:
                    continue
                raw_log = RawIngestLog(
                    source=self.source,
                    source_timestamp=normalized["logged_at"],
                    payload=_json_safe(dict(record)),
                    payload_hash=payload_hash(dict(record)),
                    status="processed",
                )
                self.session.add(raw_log)
                await self.session.flush()
                await self._persist_readings(raw_log.id, normalized["readings"], sensor_by_tag, room_by_number)
                await self._update_faults_and_alerts(normalized["readings"], sensor_by_tag, room_by_number, normalized["logged_at"])
                await self._update_snapshots(normalized["readings"], sensor_by_tag, room_by_number, normalized["logged_at"])
                rows_inserted += 1
                readings_normalized += len(normalized["readings"])
            await self._mark_success(rows_inserted)
            await self.session.commit()
        except Exception as exc:
            await self.session.rollback()
            await self._mark_error(str(exc))
            await self.session.commit()
            raise
        return {
            "rows_received": len(records),
            "rows_inserted": rows_inserted,
            "readings_normalized": readings_normalized,
            "missing_expected_sensors": sorted(missing_expected),
        }

    async def _existing_raw_log(self, logged_at: datetime) -> RawIngestLog | None:
        result = await self.session.execute(select(RawIngestLog).where(RawIngestLog.source == self.source, RawIngestLog.source_timestamp == logged_at))
        return result.scalar_one_or_none()

    async def _sensor_by_tag(self) -> dict[str, Sensor]:
        result = await self.session.execute(select(Sensor))
        return {sensor.source_tag: sensor for sensor in result.scalars().all()}

    async def _room_by_number(self) -> dict[int, Room]:
        result = await self.session.execute(select(Room))
        return {room.room_number: room for room in result.scalars().all()}

    async def _thresholds_by_tag(self, sensor_by_tag: dict[str, Sensor], room_by_number: dict[int, Room]) -> dict[str, ThresholdConfig]:
        result = await self.session.execute(select(Threshold).where(Threshold.is_active.is_(True)))
        thresholds = list(result.scalars().all())
        global_threshold = next((item for item in thresholds if item.scope_type == "global"), None)
        if global_threshold is None:
            base = DEV_DEFAULT_THRESHOLDS
        else:
            base = self._config_from_threshold(global_threshold)

        threshold_map: dict[str, ThresholdConfig] = {}
        room_by_id = {room.id: room for room in room_by_number.values()}
        for source_tag, sensor in sensor_by_tag.items():
            selected = base
            room = room_by_id.get(sensor.room_id)
            group_threshold = next((item for item in thresholds if item.scope_type == "group" and room and item.scope_key == room.group_code), None)
            if group_threshold:
                selected = self._config_from_threshold(group_threshold)
            sensor_threshold = next((item for item in thresholds if item.scope_type == "sensor" and item.scope_id == sensor.id), None)
            room_threshold = next((item for item in thresholds if item.scope_type == "room" and item.scope_id == sensor.room_id), None)
            if room_threshold:
                selected = self._config_from_threshold(room_threshold)
            if sensor_threshold:
                selected = self._config_from_threshold(sensor_threshold)
            threshold_map[source_tag] = selected
        for source_tag in EXPECTED_BY_TAG:
            threshold_map.setdefault(source_tag, base)
        return threshold_map

    @staticmethod
    def _config_from_threshold(threshold: Threshold) -> ThresholdConfig:
        return ThresholdConfig(
            warning_min_c=float(threshold.warning_min_c) if threshold.warning_min_c is not None else None,
            warning_max_c=float(threshold.warning_max_c) if threshold.warning_max_c is not None else None,
            critical_min_c=float(threshold.critical_min_c) if threshold.critical_min_c is not None else None,
            critical_max_c=float(threshold.critical_max_c) if threshold.critical_max_c is not None else None,
            stale_after_seconds=threshold.stale_after_seconds,
        )

    async def _persist_readings(self, raw_log_id: int, readings: list[dict[str, Any]], sensor_by_tag: dict[str, Sensor], room_by_number: dict[int, Room]) -> None:
        for reading in readings:
            sensor = sensor_by_tag.get(reading["source_tag"])
            room = room_by_number.get(reading["room_number"])
            self.session.add(
                TemperatureReading(
                    raw_ingest_log_id=raw_log_id,
                    sensor_id=sensor.id if sensor else None,
                    room_id=room.id if room else None,
                    source_tag=reading["source_tag"],
                    display_label=reading["label"],
                    value_c=reading["value_c"],
                    quality=reading["quality"],
                    status=reading["status"],
                    logged_at=reading["logged_at"],
                )
            )

    async def _update_faults_and_alerts(self, readings: list[dict[str, Any]], sensor_by_tag: dict[str, Sensor], room_by_number: dict[int, Room], logged_at: datetime) -> None:
        for reading in readings:
            sensor = sensor_by_tag.get(reading["source_tag"])
            room = room_by_number.get(reading["room_number"])
            if reading["status"] in {"fault", "offline"}:
                await self._open_or_touch_fault(sensor, room, reading, logged_at)
            else:
                await self._resolve_fault(sensor, reading["source_tag"], logged_at)

            if reading["status"] in {"warning", "critical"}:
                await self._open_or_touch_alert(sensor, room, reading, logged_at)
            else:
                await self._close_alert(sensor, room, logged_at)

    async def _open_or_touch_fault(self, sensor: Sensor | None, room: Room | None, reading: dict[str, Any], logged_at: datetime) -> None:
        result = await self.session.execute(select(SensorFault).where(SensorFault.source_tag == reading["source_tag"], SensorFault.status == "open"))
        fault = result.scalar_one_or_none()
        if fault:
            fault.last_seen_at = logged_at
            fault.fault_type = reading["quality"]
            fault.message = f"{reading['source_tag']} is {reading['quality']}"
            return
        self.session.add(
            SensorFault(
                sensor_id=sensor.id if sensor else None,
                room_id=room.id if room else None,
                source_tag=reading["source_tag"],
                fault_type=reading["quality"],
                message=f"{reading['source_tag']} is {reading['quality']}",
                opened_at=logged_at,
                last_seen_at=logged_at,
            )
        )

    async def _resolve_fault(self, sensor: Sensor | None, source_tag: str, logged_at: datetime) -> None:
        result = await self.session.execute(select(SensorFault).where(SensorFault.source_tag == source_tag, SensorFault.status == "open"))
        fault = result.scalar_one_or_none()
        if fault:
            fault.status = "resolved"
            fault.resolved_at = logged_at
            fault.last_seen_at = logged_at

    async def _open_or_touch_alert(self, sensor: Sensor | None, room: Room | None, reading: dict[str, Any], logged_at: datetime) -> None:
        result = await self.session.execute(select(Alert).where(Alert.sensor_id == (sensor.id if sensor else None), Alert.status == "open"))
        alert = result.scalar_one_or_none()
        message = f"{reading['source_tag']} is {reading['status']} at {reading['value_c']}C"
        if alert:
            alert.severity = reading["status"]
            alert.message = message
            alert.last_seen_at = logged_at
            return
        self.session.add(
            Alert(
                room_id=room.id if room else None,
                sensor_id=sensor.id if sensor else None,
                severity=reading["status"],
                message=message,
                opened_at=logged_at,
                last_seen_at=logged_at,
            )
        )

    async def _close_alert(self, sensor: Sensor | None, room: Room | None, logged_at: datetime) -> None:
        result = await self.session.execute(select(Alert).where(Alert.sensor_id == (sensor.id if sensor else None), Alert.status == "open"))
        alert = result.scalar_one_or_none()
        if alert:
            alert.status = "closed"
            alert.closed_at = logged_at
            alert.last_seen_at = logged_at

    async def _update_snapshots(self, readings: list[dict[str, Any]], sensor_by_tag: dict[str, Sensor], room_by_number: dict[int, Room], logged_at: datetime) -> None:
        readings_by_room: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for reading in readings:
            readings_by_room[reading["room_number"]].append(reading)

        for room_number, room_readings in readings_by_room.items():
            room = room_by_number.get(room_number)
            if not room:
                continue
            values = [reading["value_c"] for reading in room_readings]
            qualities = [reading["quality"] for reading in room_readings]
            statuses = [reading["status"] for reading in room_readings]
            snapshot = await self.session.get(CurrentRoomSnapshot, room.id)
            if snapshot is None:
                snapshot = CurrentRoomSnapshot(room_id=room.id, status="offline")
                self.session.add(snapshot)
            snapshot.average_c = room_average(values, qualities)
            snapshot.status = room_status(statuses)
            snapshot.sensor_fault_count = sum(1 for status in statuses if status in {"fault", "offline"})
            snapshot.active_alert_count = sum(1 for status in statuses if status in {"warning", "critical"})
            snapshot.latest_log_time = logged_at

    async def _mark_success(self, rows_inserted: int) -> None:
        status = await self._get_status()
        status.last_success_at = datetime.now(timezone.utc)
        status.last_error = None
        status.rows_ingested += rows_inserted

    async def _mark_error(self, error: str) -> None:
        status = await self._get_status()
        status.last_error_at = datetime.now(timezone.utc)
        status.last_error = error[:4000]

    async def _get_status(self) -> IngestionStatus:
        result = await self.session.execute(select(IngestionStatus).where(IngestionStatus.source == self.source))
        status = result.scalar_one_or_none()
        if status:
            return status
        status = IngestionStatus(source=self.source)
        self.session.add(status)
        await self.session.flush()
        return status
