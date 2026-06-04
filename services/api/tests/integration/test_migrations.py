from app.db.base import Base


def test_required_tables_are_registered() -> None:
    required = {
        "users",
        "roles",
        "rooms",
        "sensors",
        "temperature_readings",
        "current_room_snapshots",
        "thresholds",
        "alerts",
        "sensor_faults",
        "ip_allowlist",
        "report_downloads",
        "audit_logs",
        "raw_ingest_logs",
        "system_settings",
    }
    assert required.issubset(set(Base.metadata.tables))
