"""Tests for the retrieval service."""
from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.retriever import RetrievalResult, retrieve


@pytest.fixture
def mock_db_rows():
    """Create mock database rows from pgvector search."""
    rows = []
    for i in range(3):
        row = MagicMock()
        row.id = uuid.uuid4()
        row.document_id = uuid.uuid4()
        row.content = f"This is chunk {i} with relevant content about password resets."
        row.similarity = 0.95 - (i * 0.1)
        row.token_count = 15
        row.metadata = {"section": f"Section {i}"}
        rows.append(row)
    return rows


class TestRetrieve:
    """Tests for the retrieve function."""

    @pytest.mark.asyncio
    @patch("app.services.retriever.cache_get", return_value=None)
    @patch("app.services.retriever.cache_set")
    @patch("app.services.retriever.get_embedding")
    async def test_retrieve_returns_results(
        self,
        mock_embedding: AsyncMock,
        mock_cache_set: AsyncMock,
        mock_cache_get: AsyncMock,
        mock_db: AsyncMock,
        mock_db_rows: list[MagicMock],
        tenant_id: uuid.UUID,
    ):
        """Test basic retrieval returns ranked results."""
        mock_embedding.return_value = [0.1] * 1536

        # Mock DB execute to return rows
        result_mock = MagicMock()
        result_mock.fetchall.return_value = mock_db_rows
        mock_db.execute = AsyncMock(return_value=result_mock)

        results = await retrieve(
            query="How do I reset my password?",
            tenant_id=tenant_id,
            db=mock_db,
            top_k=5,
        )

        assert len(results) == 3
        assert all(isinstance(r, RetrievalResult) for r in results)
        # Results should be ordered by score (highest first)
        assert results[0].score >= results[1].score >= results[2].score

    @pytest.mark.asyncio
    @patch("app.services.retriever.cache_get", return_value=None)
    @patch("app.services.retriever.cache_set")
    @patch("app.services.retriever.get_embedding")
    async def test_retrieve_empty_results(
        self,
        mock_embedding: AsyncMock,
        mock_cache_set: AsyncMock,
        mock_cache_get: AsyncMock,
        mock_db: AsyncMock,
        tenant_id: uuid.UUID,
    ):
        """Test retrieval with no matching results."""
        mock_embedding.return_value = [0.1] * 1536

        result_mock = MagicMock()
        result_mock.fetchall.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        results = await retrieve(
            query="Something completely unrelated",
            tenant_id=tenant_id,
            db=mock_db,
        )

        assert len(results) == 0

    @pytest.mark.asyncio
    @patch("app.services.retriever.cache_set")
    @patch("app.services.retriever.get_embedding")
    async def test_retrieve_uses_cache(
        self,
        mock_embedding: AsyncMock,
        mock_cache_set: AsyncMock,
        mock_db: AsyncMock,
        tenant_id: uuid.UUID,
    ):
        """Test that cached results are returned without DB query."""
        cached_data = [
            {
                "chunk_id": str(uuid.uuid4()),
                "document_id": str(uuid.uuid4()),
                "content": "Cached content",
                "score": 0.9,
                "token_count": 5,
                "metadata": {},
            }
        ]

        with patch("app.services.retriever.cache_get", return_value=cached_data):
            results = await retrieve(
                query="cached query",
                tenant_id=tenant_id,
                db=mock_db,
            )

        assert len(results) == 1
        assert results[0].content == "Cached content"
        assert results[0].score == 0.9
        # DB should not have been called
        mock_db.execute.assert_not_called()
        # Embedding should not have been generated
        mock_embedding.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.retriever.cache_get", return_value=None)
    @patch("app.services.retriever.cache_set")
    @patch("app.services.retriever.get_embedding")
    async def test_retrieve_tenant_isolation(
        self,
        mock_embedding: AsyncMock,
        mock_cache_set: AsyncMock,
        mock_cache_get: AsyncMock,
        mock_db: AsyncMock,
    ):
        """Test that retrieval is scoped to tenant_id."""
        mock_embedding.return_value = [0.1] * 1536

        result_mock = MagicMock()
        result_mock.fetchall.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        tenant_a = uuid.uuid4()
        tenant_b = uuid.uuid4()

        await retrieve(query="test", tenant_id=tenant_a, db=mock_db)
        await retrieve(query="test", tenant_id=tenant_b, db=mock_db)

        # Both calls should have been made (different tenants = different queries)
        assert mock_db.execute.call_count == 2

        # Verify tenant_id was passed in the SQL parameters
        for call in mock_db.execute.call_args_list:
            params = call[0][1] if len(call[0]) > 1 else call[1].get("parameters", {})
            if isinstance(params, dict):
                assert "tenant_id" in params

    @pytest.mark.asyncio
    @patch("app.services.retriever.cache_get", return_value=None)
    @patch("app.services.retriever.cache_set")
    @patch("app.services.retriever.get_embedding")
    async def test_retrieve_caches_results(
        self,
        mock_embedding: AsyncMock,
        mock_cache_set: AsyncMock,
        mock_cache_get: AsyncMock,
        mock_db: AsyncMock,
        mock_db_rows: list[MagicMock],
        tenant_id: uuid.UUID,
    ):
        """Test that results are cached after retrieval."""
        mock_embedding.return_value = [0.1] * 1536

        result_mock = MagicMock()
        result_mock.fetchall.return_value = mock_db_rows
        mock_db.execute = AsyncMock(return_value=result_mock)

        await retrieve(query="test query", tenant_id=tenant_id, db=mock_db)

        # cache_set should have been called
        mock_cache_set.assert_called_once()
        cache_args = mock_cache_set.call_args
        # Verify TTL was set
        assert cache_args[1].get("ttl") is not None or (len(cache_args[0]) > 2 and cache_args[0][2] is not None)


class TestRetrievalResult:
    """Tests for the RetrievalResult dataclass."""

    def test_creation(self):
        result = RetrievalResult(
            chunk_id="abc",
            document_id="def",
            content="Some content",
            score=0.95,
            token_count=5,
            metadata={"section": "Test"},
        )
        assert result.chunk_id == "abc"
        assert result.score == 0.95
        assert result.metadata["section"] == "Test"
