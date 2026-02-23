from __future__ import annotations

import hashlib
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.document import Document, DocumentChunk
from app.services.chunker import chunk_html, chunk_markdown, chunk_text
from app.services.embedding import count_tokens, get_embeddings_batch

logger = get_logger(__name__)


async def ingest_document(document_id: str, db: AsyncSession) -> None:
    """Full ingestion pipeline for a document.

    1. Fetch document from DB
    2. Parse content based on source_type
    3. Chunk the content
    4. Generate embeddings for each chunk
    5. Store chunks with embeddings in DB (pgvector)
    6. Update document status
    """
    doc_uuid = uuid.UUID(document_id)

    # Step 1: Fetch document
    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    doc = result.scalar_one_or_none()
    if doc is None:
        logger.error("document_not_found", document_id=document_id)
        return

    if doc.status == "ready":
        logger.info("document_already_processed", document_id=document_id)
        return

    # Mark as processing
    await db.execute(
        update(Document).where(Document.id == doc_uuid).values(status="processing")
    )
    await db.commit()

    try:
        raw_content = doc.raw_content or ""
        if not raw_content.strip():
            raise ValueError("Document has no content to ingest")

        # Step 2 & 3: Parse and chunk based on source type
        logger.info("chunking_document", document_id=document_id, source_type=doc.source_type)

        if doc.source_type == "markdown":
            chunks = chunk_markdown(raw_content, settings.chunk_size, settings.chunk_overlap)
        elif doc.source_type == "html":
            chunks = chunk_html(raw_content, settings.chunk_size, settings.chunk_overlap)
        else:
            # text and pdf (pdf text already extracted at upload time)
            chunks = chunk_text(raw_content, settings.chunk_size, settings.chunk_overlap)

        if not chunks:
            raise ValueError("No chunks generated from document content")

        logger.info("chunks_generated", document_id=document_id, chunk_count=len(chunks))

        # Step 4: Generate embeddings in batch
        chunk_texts = [c.content for c in chunks]
        embeddings = await get_embeddings_batch(chunk_texts)

        # Step 5: Store chunks with embeddings
        # First, delete any existing chunks for this document (re-ingestion)
        existing_chunks = await db.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc_uuid)
        )
        for old_chunk in existing_chunks.scalars().all():
            await db.delete(old_chunk)
        await db.flush()

        for chunk, embedding in zip(chunks, embeddings):
            db_chunk = DocumentChunk(
                id=uuid.uuid4(),
                document_id=doc_uuid,
                tenant_id=doc.tenant_id,
                content=chunk.content,
                chunk_index=chunk.index,
                token_count=chunk.token_count or count_tokens(chunk.content),
                embedding=embedding,
                metadata_=chunk.metadata,
            )
            db.add(db_chunk)

        # Step 6: Update document status
        content_hash = hashlib.sha256(raw_content.encode()).hexdigest()
        await db.execute(
            update(Document)
            .where(Document.id == doc_uuid)
            .values(
                status="ready",
                chunk_count=len(chunks),
                content_hash=content_hash,
            )
        )
        await db.commit()

        logger.info(
            "document_ingested",
            document_id=document_id,
            chunk_count=len(chunks),
            status="ready",
        )

    except Exception as exc:
        logger.error(
            "ingestion_failed",
            document_id=document_id,
            error=str(exc),
        )
        await db.rollback()
        await db.execute(
            update(Document).where(Document.id == doc_uuid).values(status="failed")
        )
        await db.commit()
        raise
