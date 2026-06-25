import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import current_user
from app.api.routes import admin, auth, dashboard, health, ingest, reports
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.security import InMemoryRateLimitMiddleware, SecurityHeadersMiddleware
from app.db.session import AsyncSessionLocal
from app.services.ingestion import IngestionService
from app.services.providers import build_provider

configure_logging()
logger = logging.getLogger(__name__)


async def polling_loop() -> None:
    while True:
        try:
            provider = build_provider()
            records = await provider.fetch_latest()
            async with AsyncSessionLocal() as session:
                await IngestionService(session, source=provider.name).ingest_records(records)
        except Exception as exc:
            # Polling health is persisted by IngestionService when ingestion starts; provider construction
            # failures are intentionally not logged with secrets or request data.
            logger.warning("ingestion_poll_failed", extra={"error_type": type(exc).__name__})
        await asyncio.sleep(settings.api_poll_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task: asyncio.Task | None = None
    if settings.api_data_provider == "http_live_api":
        task = asyncio.create_task(polling_loop())
    yield
    if task:
        task.cancel()


docs_enabled = settings.environment != "production" or settings.api_openapi_enabled_in_production
app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
    lifespan=lifespan,
)

# Dashboard access is controlled solely by admin-managed user accounts
# (email + password, with activate/deactivate to grant/revoke). IP-based
# allowlisting is intentionally not enforced.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(InMemoryRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)

for prefix in ("/api", "/api/v1"):
    app.include_router(health.router, prefix=prefix)
    app.include_router(health.ready_router, prefix=prefix)
    app.include_router(health.metrics_router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)
    # Dashboard telemetry is gated behind an authenticated session. Anonymous
    # callers receive 401 and the SPA redirects them to the login screen.
    app.include_router(dashboard.router, prefix=prefix, dependencies=[Depends(current_user)])
    app.include_router(dashboard.live_router, prefix=prefix, dependencies=[Depends(current_user)])
    app.include_router(ingest.router, prefix=prefix)
    app.include_router(reports.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)
