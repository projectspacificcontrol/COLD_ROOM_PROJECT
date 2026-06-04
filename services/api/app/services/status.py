from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class ThresholdConfig:
    warning_min_c: float | None
    warning_max_c: float | None
    critical_min_c: float | None
    critical_max_c: float | None
    stale_after_seconds: int


DEV_DEFAULT_THRESHOLDS = ThresholdConfig(
    warning_min_c=None,
    warning_max_c=5.5,
    critical_min_c=None,
    critical_max_c=7.0,
    stale_after_seconds=900,
)

IMPOSSIBLE_MIN_C = -80.0
IMPOSSIBLE_MAX_C = 80.0


def quality_for_value(value_c: float | None, base_quality: str) -> str:
    if base_quality != "good" or value_c is None:
        return base_quality
    if value_c < IMPOSSIBLE_MIN_C or value_c > IMPOSSIBLE_MAX_C:
        return "impossible"
    return "good"


def sensor_status(value_c: float | None, quality: str, thresholds: ThresholdConfig, logged_at: datetime, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    if logged_at.tzinfo is None:
        logged_at = logged_at.replace(tzinfo=timezone.utc)
    age_seconds = (now - logged_at.astimezone(timezone.utc)).total_seconds()
    if age_seconds > thresholds.stale_after_seconds:
        return "offline"
    if quality != "good" or value_c is None:
        return "fault"
    if thresholds.critical_min_c is not None and value_c <= thresholds.critical_min_c:
        return "critical"
    if thresholds.critical_max_c is not None and value_c >= thresholds.critical_max_c:
        return "critical"
    if thresholds.warning_min_c is not None and value_c <= thresholds.warning_min_c:
        return "warning"
    if thresholds.warning_max_c is not None and value_c >= thresholds.warning_max_c:
        return "warning"
    return "normal"


def room_status(sensor_statuses: list[str]) -> str:
    if not sensor_statuses:
        return "offline"
    if all(status in {"fault", "offline"} for status in sensor_statuses):
        return "offline"
    if "critical" in sensor_statuses:
        return "critical"
    if "warning" in sensor_statuses:
        return "warning"
    if "fault" in sensor_statuses or "offline" in sensor_statuses:
        return "fault"
    return "normal"


def room_average(values: list[float | None], qualities: list[str]) -> float | None:
    valid = [value for value, quality in zip(values, qualities, strict=True) if quality == "good" and value is not None]
    if not valid:
        return None
    return round(sum(valid) / len(valid), 3)
