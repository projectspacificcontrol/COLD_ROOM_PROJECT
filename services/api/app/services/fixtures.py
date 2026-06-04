from datetime import datetime, timedelta, timezone
from random import Random

from app.core.room_config import ROOM_GROUPS, SENSORS_PER_ROOM, expected_sensor_mappings
from app.services.normalizer import normalize_record
from app.services.status import room_status


def fixture_record(seed: int = 42) -> dict[str, object]:
    rng = Random(seed)
    record: dict[str, object] = {"LogTime": datetime.now(timezone.utc).isoformat()}
    for mapping in expected_sensor_mappings():
        base = 4.1 + rng.uniform(-1.4, 1.4)
        if mapping.room_number in {3, 5, 12, 14} and mapping.position_in_room in {1, 2, 3, 4, 5}:
            base = 7.1 + rng.uniform(0.0, 1.4)
        if mapping.room_number == 4 and mapping.position_in_room == 4:
            base = 5.8
        if mapping.room_number == 18:
            continue
        record[mapping.source_tag] = round(base, 1)
    return record


def dashboard_fixture() -> dict:
    normalized = normalize_record(fixture_record())
    readings_by_room: dict[int, list[dict]] = {}
    for reading in normalized["readings"]:
        readings_by_room.setdefault(reading["room_number"], []).append(reading)

    groups = []
    all_good_values = []
    alert_count = 0
    warning_count = 0
    critical_count = 0
    faults = 0

    for group_code, rooms in ROOM_GROUPS:
        room_items = []
        for room_number in rooms:
            sensors = readings_by_room[room_number]
            values = [sensor["value_c"] for sensor in sensors if sensor["quality"] == "good" and sensor["value_c"] is not None]
            status = room_status([sensor["status"] for sensor in sensors])
            all_good_values.extend(values)
            faults += sum(1 for sensor in sensors if sensor["status"] == "fault")
            critical_count += 1 if status == "critical" else 0
            warning_count += 1 if status == "warning" else 0
            alert_count += 1 if status in {"critical", "warning"} else 0
            room_items.append(
                {
                    "room_number": room_number,
                    "room_name": f"Cold Room {room_number}",
                    "group_code": group_code,
                    "average_c": round(sum(values) / len(values), 1) if values else None,
                    "status": status,
                    "sensors": sensors,
                    "active_alerts": [f"{status.title()} temperature condition"] if status in {"critical", "warning"} else [],
                }
            )
        groups.append({"group_code": group_code, "room_numbers": list(rooms), "rooms": room_items})

    return {
        "overview": {
            "total_rooms": 18,
            "total_sensors": SENSORS_PER_ROOM * 18,
            "average_c": round(sum(all_good_values) / len(all_good_values), 1) if all_good_values else None,
            "active_alerts": alert_count,
            "critical_alerts": critical_count,
            "warning_alerts": warning_count,
            "sensor_faults": faults,
            "last_log_time": normalized["logged_at"],
        },
        "groups": groups,
    }


def room_history_fixture(room_number: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    points = []
    for index in range(24):
        snapshot = dashboard_fixture()
        room = next(room for group in snapshot["groups"] for room in group["rooms"] if room["room_number"] == room_number)
        points.append(
            {
                "logged_at": now - timedelta(minutes=(23 - index) * 5),
                "average_c": room["average_c"],
                "sensors": room["sensors"],
            }
        )
    return points
