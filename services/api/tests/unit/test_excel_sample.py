from pathlib import Path

from app.services.excel_parser import parse_excel_file
from app.services.normalizer import normalize_records


def test_uploaded_excel_shape_is_supported() -> None:
    sample = Path(r"e:\Pacific Control Project\sample\dbo.COLD_ROOM_TEMP.xlsx")
    if not sample.exists():
        return

    records = parse_excel_file(sample)
    normalized = normalize_records(records[:1])

    assert records
    assert normalized["rows_received"] == 1
    assert len(normalized["readings"]) == 90
    assert normalized["missing_expected_sensors"] == [
        "CR161718_TT11",
        "CR161718_TT12",
        "CR161718_TT13",
        "CR161718_TT14",
        "CR161718_TT15",
    ]

