from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Mapping

from app.core.room_config import EXPECTED_BY_TAG, SensorMapping, expected_sensor_mappings, missing_expected_tags
from app.services.status import DEV_DEFAULT_THRESHOLDS, ThresholdConfig, quality_for_value, sensor_status


def parse_log_time(value: Any) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        parsed = datetime.fromisoformat(value.strip())
    else:
        raise ValueError("LogTime is required and must be a datetime or ISO-like string")
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def parse_temperature(value: Any) -> tuple[float | None, str]:
    if value in (None, ""):
        return None, "missing"
    try:
        return float(Decimal(str(value).strip())), "good"
    except (InvalidOperation, ValueError):
        return None, "invalid"


def normalize_record(record: Mapping[str, Any], thresholds_by_tag: Mapping[str, ThresholdConfig] | None = None) -> dict[str, Any]:
    logged_at = parse_log_time(record.get("LogTime"))
    headers = [str(key) for key in record.keys()]
    readings: list[dict[str, Any]] = []

    for mapping in expected_sensor_mappings():
        value, quality = parse_temperature(record.get(mapping.source_tag))
        if mapping.source_tag not in record:
            quality = "unavailable"
        quality = quality_for_value(value, quality)
        thresholds = thresholds_by_tag.get(mapping.source_tag, DEV_DEFAULT_THRESHOLDS) if thresholds_by_tag else DEV_DEFAULT_THRESHOLDS
        readings.append(
            {
                "logged_at": logged_at,
                "group_code": mapping.group_code,
                "room_number": mapping.room_number,
                "source_tag": mapping.source_tag,
                "label": mapping.display_label,
                "position_in_room": mapping.position_in_room,
                "value_c": value,
                "quality": quality,
                "status": sensor_status(value, quality, thresholds, logged_at),
            }
        )

    return {
        "logged_at": logged_at,
        "readings": readings,
        "missing_expected_sensors": missing_expected_tags(headers),
    }


def normalize_records(records: list[Mapping[str, Any]], thresholds_by_tag: Mapping[str, ThresholdConfig] | None = None) -> dict[str, Any]:
    normalized = [normalize_record(record, thresholds_by_tag) for record in records]
    missing = sorted({tag for row in normalized for tag in row["missing_expected_sensors"]})
    return {
        "rows_received": len(records),
        "readings": [reading for row in normalized for reading in row["readings"]],
        "missing_expected_sensors": missing,
    }


def mapping_for_tag(source_tag: str) -> SensorMapping | None:
    return EXPECTED_BY_TAG.get(source_tag)
