from app.services.normalizer import normalize_record


def test_normalize_record_includes_unavailable_expected_sensors() -> None:
    normalized = normalize_record({"LogTime": "2026-03-08 12:30:22", "CR123_TT01": "4.2"})

    assert len(normalized["readings"]) == 90
    assert "CR161718_TT15" in normalized["missing_expected_sensors"]

    first = next(reading for reading in normalized["readings"] if reading["source_tag"] == "CR123_TT01")
    missing = next(reading for reading in normalized["readings"] if reading["source_tag"] == "CR123_TT02")

    assert first["room_number"] == 1
    assert first["label"] == "T1"
    assert first["quality"] == "good"
    assert missing["quality"] == "unavailable"
    assert missing["status"] == "offline"


def test_tt_offsets_map_to_room_sensor_labels() -> None:
    normalized = normalize_record({"LogTime": "2026-03-08T12:30:22", "CR123_TT06": "4.8", "CR123_TT11": "5.1"})

    room_two = next(reading for reading in normalized["readings"] if reading["source_tag"] == "CR123_TT06")
    room_three = next(reading for reading in normalized["readings"] if reading["source_tag"] == "CR123_TT11")

    assert room_two["room_number"] == 2
    assert room_two["label"] == "T1"
    assert room_three["room_number"] == 3
    assert room_three["label"] == "T1"
