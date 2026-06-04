from dataclasses import dataclass
import re


ROOM_GROUPS: tuple[tuple[str, tuple[int, int, int]], ...] = (
    ("CR123", (1, 2, 3)),
    ("CR456", (4, 5, 6)),
    ("CR789", (7, 8, 9)),
    ("CR101112", (10, 11, 12)),
    ("CR131415", (13, 14, 15)),
    ("CR161718", (16, 17, 18)),
)

SENSORS_PER_ROOM = 5
ROOMS_PER_GROUP = 3
EXPECTED_SENSOR_COUNT = len(ROOM_GROUPS) * ROOMS_PER_GROUP * SENSORS_PER_ROOM
TAG_PATTERN = re.compile(r"^(CR\d+)_TT(\d{2})$")


@dataclass(frozen=True)
class SensorMapping:
    group_code: str
    room_number: int
    source_tag: str
    tt_index: int
    position_in_room: int
    display_label: str


def expected_sensor_mappings() -> list[SensorMapping]:
    mappings: list[SensorMapping] = []
    for group_code, rooms in ROOM_GROUPS:
        for room_offset, room_number in enumerate(rooms):
            for sensor_offset in range(SENSORS_PER_ROOM):
                tt_index = room_offset * SENSORS_PER_ROOM + sensor_offset + 1
                source_tag = f"{group_code}_TT{tt_index:02d}"
                position = sensor_offset + 1
                mappings.append(
                    SensorMapping(
                        group_code=group_code,
                        room_number=room_number,
                        source_tag=source_tag,
                        tt_index=tt_index,
                        position_in_room=position,
                        display_label=f"T{position}",
                    )
                )
    return mappings


EXPECTED_BY_TAG = {mapping.source_tag: mapping for mapping in expected_sensor_mappings()}


def map_source_tag(source_tag: str) -> SensorMapping | None:
    match = TAG_PATTERN.match(source_tag)
    if not match:
        return None
    return EXPECTED_BY_TAG.get(source_tag)


def missing_expected_tags(headers: list[str]) -> list[str]:
    available = set(headers)
    return [tag for tag in EXPECTED_BY_TAG if tag not in available]

