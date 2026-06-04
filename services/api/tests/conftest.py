import asyncio
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["API_SECRET_KEY"] = "test-secret-key-with-more-than-24-chars"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_api.db"
os.environ["API_BOOTSTRAP_ADMIN_EMAIL"] = "admin@example.com"
os.environ["API_BOOTSTRAP_ADMIN_PASSWORD"] = "ValidPassword123!"
os.environ["API_FIXTURE_EXCEL_PATH"] = r"e:\Pacific Control Project\sample\dbo.COLD_ROOM_TEMP.xlsx"
os.environ["API_ALLOWED_ORIGINS"] = "http://testserver"

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.scripts.seed import seed  # noqa: E402


async def _reset_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await seed()


@pytest.fixture(autouse=True)
def reset_database():
    asyncio.run(_reset_database())
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_client(client: TestClient) -> TestClient:
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "ValidPassword123!"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    client.headers.update({"X-CSRF-Token": csrf})
    return client


def pytest_sessionfinish(session, exitstatus):
    db_path = Path("test_api.db")
    if db_path.exists():
        db_path.unlink()
