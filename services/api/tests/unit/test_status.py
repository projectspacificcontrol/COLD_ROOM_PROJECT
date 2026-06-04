from datetime import datetime, timezone

from app.services.status import ThresholdConfig, room_average, room_status, sensor_status


def test_sensor_status_uses_supplied_thresholds() -> None:
    thresholds = ThresholdConfig(warning_min_c=None, warning_max_c=5.0, critical_min_c=None, critical_max_c=7.0, stale_after_seconds=900)
    now = datetime.now(timezone.utc)

    assert sensor_status(4.0, "good", thresholds, now, now) == "normal"
    assert sensor_status(5.5, "good", thresholds, now, now) == "warning"
    assert sensor_status(7.5, "good", thresholds, now, now) == "critical"
    assert sensor_status(None, "unavailable", thresholds, now, now) == "fault"


def test_room_average_ignores_faulted_sensors() -> None:
    assert room_average([4.0, None, 5.0], ["good", "unavailable", "good"]) == 4.5
    assert room_average([None], ["missing"]) is None


def test_room_status_priority() -> None:
    assert room_status(["normal", "warning"]) == "warning"
    assert room_status(["normal", "critical"]) == "critical"
    assert room_status(["fault", "offline"]) == "offline"

