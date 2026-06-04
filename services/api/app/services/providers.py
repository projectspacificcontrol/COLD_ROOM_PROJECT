from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import httpx

from app.core.config import settings
from app.services.excel_parser import parse_excel_file


class RawDataProvider(ABC):
    name: str

    @abstractmethod
    async def fetch_latest(self) -> list[dict[str, Any]]:
        raise NotImplementedError


class ExcelFixtureProvider(RawDataProvider):
    name = "excel_fixture"

    def __init__(self, path: str | Path):
        self.path = Path(path)

    async def fetch_latest(self) -> list[dict[str, Any]]:
        records = parse_excel_file(self.path)
        return records[-1:] if records else []


class HttpLiveApiProvider(RawDataProvider):
    name = "http_live_api"

    def __init__(self, url: str, token: str | None):
        self.url = url
        self.token = token

    async def fetch_latest(self) -> list[dict[str, Any]]:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(self.url, headers=headers)
            response.raise_for_status()
            payload = response.json()
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict) and isinstance(payload.get("data"), list):
            return payload["data"]
        if isinstance(payload, dict):
            return [payload]
        raise ValueError("Live API returned unsupported JSON shape")


def build_provider() -> RawDataProvider:
    if settings.api_data_provider == "http_live_api":
        if not settings.api_live_source_url:
            raise ValueError("API_LIVE_SOURCE_URL is required for http_live_api provider")
        return HttpLiveApiProvider(settings.api_live_source_url, settings.api_live_source_token)
    if not settings.api_fixture_excel_path:
        raise ValueError("API_FIXTURE_EXCEL_PATH is required for excel_fixture provider")
    return ExcelFixtureProvider(settings.api_fixture_excel_path)
