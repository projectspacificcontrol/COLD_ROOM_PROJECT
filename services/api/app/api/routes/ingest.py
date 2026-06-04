from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import admin_user, require_csrf
from app.db.session import get_session
from app.models.entities import User
from app.schemas.dashboard import IngestResultOut
from app.services.excel_parser import parse_excel_upload
from app.services.ingestion import IngestionService
from app.services.providers import build_provider

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/records", response_model=IngestResultOut)
async def ingest_records(records: list[dict[str, Any]], _: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    return await IngestionService(session, source="manual_records").ingest_records(records)


@router.post("/excel", response_model=IngestResultOut, dependencies=[Depends(require_csrf)])
async def ingest_excel(file: UploadFile = File(...), _: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    records = parse_excel_upload(file.file)
    return await IngestionService(session, source="excel_upload").ingest_records(records)


@router.post("/poll-now", response_model=IngestResultOut, dependencies=[Depends(require_csrf)])
async def poll_now(_: User = Depends(admin_user), session: AsyncSession = Depends(get_session)) -> dict:
    provider = build_provider()
    records = await provider.fetch_latest()
    return await IngestionService(session, source=provider.name).ingest_records(records)
