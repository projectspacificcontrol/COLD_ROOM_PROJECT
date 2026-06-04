import json
import logging
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "error_type"):
            payload["error_type"] = getattr(record, "error_type")
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    root = logging.getLogger()
    if root.handlers and getattr(root.handlers[0].formatter, "_cold_room_json", False):
        return
    handler = logging.StreamHandler(sys.stdout)
    formatter = JsonFormatter()
    setattr(formatter, "_cold_room_json", True)
    handler.setFormatter(formatter)
    root.handlers = [handler]
    root.setLevel(logging.INFO)
