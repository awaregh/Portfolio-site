from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import cache_get, cache_set
from app.services.embedding import get_embedding

logger = get_logger(__name__)


@dataclass
class RetrievalResult:
    """A single retrieval result with content, score, and metadata."""
    chunk_id: str
    document_id: str
    content: str
    score: float
    token_count: int
    metadata: dict[str, Any]


async def retrieve(
    query: str,
    tenant_id: UUID,
    db: AsyncSession,
    top_k: int | None = None,
    similarity_threshold: float | None = None,
) -> list[RetrievalResult]:
    """Retrieve the most relevant document chunks for a query.

    1. Generate query embedding
    2. Query pgvector for nearest neighbors filtered by tenant_id
    3. Apply similarity threshold
    4. Return ranked chunks with scores and metadata
    """
    top_k = top_k or settings.top_k_results
    similarity_threshold = similarity_threshold or settings.similarity_threshold

    # Check cache first
    cache_key = f"retrieval:{tenant_id}:{hash(query)}"
    cached = await cache_get(cache_key)
    if cached is not None:
        logger.debug("retrieval_cache_hit", query=query[:50])
        return [RetrievalResult(**item) for item in cached]

    # Generate query embedding
    query_embedding = await get_embedding(query)

    # pgvector cosine similarity search with tenant isolation
    # Using cosine distance operator <=> (lower is more similar)
    # Convert to similarity: 1 - distance
    query_sql = text("""
        SELECT
            id,
            document_id,
            content,
            token_count,
            metadata,
            1 - (embedding <=> :embedding::vector) AS similarity
        FROM document_chunks
        WHERE tenant_id = :tenant_id
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> :embedding::vector) >= :threshold
        ORDER BY embedding <=> :embedding::vector
        LIMIT :top_k
    """)

    result = await db.execute(
        query_sql,
        {
            "embedding": str(query_embedding),
            "tenant_id": str(tenant_id),
            "threshold": similarity_threshold,
            "top_k": top_k,
        },
    )

    rows = result.fetchall()
    results: list[RetrievalResult] = []

    for row in rows:
        metadata = row.metadata if isinstance(row.metadata, dict) else {}
        results.append(RetrievalResult(
            chunk_id=str(row.id),
            document_id=str(row.document_id),
            content=row.content,
            score=float(row.similarity),
            token_count=row.token_count,
            metadata=metadata,
        ))

    # Cache results with short TTL
    if results:
        await cache_set(
            cache_key,
            [
                {
                    "chunk_id": r.chunk_id,
                    "document_id": r.document_id,
                    "content": r.content,
                    "score": r.score,
                    "token_count": r.token_count,
                    "metadata": r.metadata,
                }
                for r in results
            ],
            ttl=settings.query_cache_ttl_seconds,
        )

    logger.info(
        "retrieval_completed",
        query=query[:50],
        results_count=len(results),
        top_score=results[0].score if results else None,
    )

    return results
