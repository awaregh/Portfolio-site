from __future__ import annotations

import hashlib
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.redis import enqueue_job
from app.core.config import settings
from app.core.security import get_current_user
from app.models.document import Document, DocumentChunk
from app.models.tenant import Tenant

router = APIRouter(prefix="/documents", tags=["documents"])
logger = get_logger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    title: str
    content: str
    source_type: str = "text"  # text | markdown | html | pdf
    source_url: str | None = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    source_type: str
    source_url: str | None
    status: str
    chunk_count: int
    content_hash: str | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int


class DocumentDetailResponse(DocumentResponse):
    raw_content: str | None = None


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/ingest", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def ingest_document(
    body: IngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Accept content for ingestion into the RAG pipeline."""
    content_hash = hashlib.sha256(body.content.encode()).hexdigest()

    # Deduplication check
    existing = await db.execute(
        select(Document).where(
            Document.tenant_id == tenant.id,
            Document.content_hash == content_hash,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document with identical content already exists",
        )

    doc = Document(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        title=body.title,
        source_url=body.source_url,
        source_type=body.source_type,
        content_hash=content_hash,
        status="pending",
        raw_content=body.content,
    )
    db.add(doc)
    await db.flush()

    # Enqueue ingestion job
    await enqueue_job(
        settings.ingestion_queue,
        {"document_id": str(doc.id), "tenant_id": str(tenant.id)},
    )
    logger.info("document_enqueued", document_id=str(doc.id), tenant_id=str(tenant.id))

    return DocumentResponse(
        id=str(doc.id),
        title=doc.title,
        source_type=doc.source_type,
        source_url=doc.source_url,
        status=doc.status,
        chunk_count=doc.chunk_count,
        content_hash=doc.content_hash,
        created_at=str(doc.created_at),
        updated_at=str(doc.updated_at),
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """List documents for the current tenant, paginated."""
    base_query = select(Document).where(Document.tenant_id == tenant.id)

    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    # Paginated results
    result = await db.execute(
        base_query.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    docs = result.scalars().all()

    return DocumentListResponse(
        items=[
            DocumentResponse(
                id=str(d.id),
                title=d.title,
                source_type=d.source_type,
                source_url=d.source_url,
                status=d.status,
                chunk_count=d.chunk_count,
                content_hash=d.content_hash,
                created_at=str(d.created_at),
                updated_at=str(d.updated_at),
            )
            for d in docs
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Get document detail with chunk count."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == tenant.id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return DocumentDetailResponse(
        id=str(doc.id),
        title=doc.title,
        source_type=doc.source_type,
        source_url=doc.source_url,
        status=doc.status,
        chunk_count=doc.chunk_count,
        content_hash=doc.content_hash,
        raw_content=doc.raw_content,
        created_at=str(doc.created_at),
        updated_at=str(doc.updated_at),
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Delete a document and all associated chunks."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == tenant.id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await db.delete(doc)
    logger.info("document_deleted", document_id=document_id, tenant_id=str(tenant.id))
