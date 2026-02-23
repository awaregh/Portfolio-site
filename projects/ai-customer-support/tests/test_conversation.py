"""Tests for the conversation engine."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.conversation_engine import ConversationEngine
from app.services.retriever import RetrievalResult


@pytest.fixture
def mock_conversation():
    """Create a mock Conversation object."""
    conv = MagicMock()
    conv.id = uuid.uuid4()
    conv.tenant_id = uuid.uuid4()
    conv.status = "active"
    conv.summary = None
    conv.message_count = 0
    conv.metadata_ = {}
    return conv


@pytest.fixture
def mock_messages():
    """Create mock message history."""
    messages = []
    for i, (role, content) in enumerate([
        ("user", "How do I reset my password?"),
        ("assistant", "You can reset your password by clicking the 'Forgot Password' link."),
        ("user", "Where is that link?"),
    ]):
        msg = MagicMock()
        msg.id = uuid.uuid4()
        msg.role = role
        msg.content = content
        msg.created_at = datetime(2024, 1, 1, i, 0, 0, tzinfo=timezone.utc)
        messages.append(msg)
    return messages


@pytest.fixture
def sample_retrieval_results(tenant_id: uuid.UUID) -> list[RetrievalResult]:
    """Create sample retrieval results."""
    return [
        RetrievalResult(
            chunk_id=str(uuid.uuid4()),
            document_id=str(uuid.uuid4()),
            content="To reset your password, navigate to Settings > Security > Change Password.",
            score=0.92,
            token_count=15,
            metadata={"section": "## Account Settings"},
        ),
        RetrievalResult(
            chunk_id=str(uuid.uuid4()),
            document_id=str(uuid.uuid4()),
            content="You can also use the 'Forgot Password' link on the login page.",
            score=0.85,
            token_count=13,
            metadata={"section": "## Login Help"},
        ),
    ]


class TestConversationEngine:
    """Tests for ConversationEngine orchestration."""

    def test_build_context(self, mock_db: AsyncMock, sample_retrieval_results: list[RetrievalResult]):
        engine = ConversationEngine(mock_db)
        context = engine._build_context(sample_retrieval_results)

        assert "[Source 1" in context
        assert "[Source 2" in context
        assert "reset your password" in context
        assert "relevance: 0.92" in context

    def test_build_context_empty(self, mock_db: AsyncMock):
        engine = ConversationEngine(mock_db)
        context = engine._build_context([])
        assert context == ""

    def test_extract_sources(self, mock_db: AsyncMock, sample_retrieval_results: list[RetrievalResult]):
        engine = ConversationEngine(mock_db)
        sources = engine._extract_sources(sample_retrieval_results)

        assert len(sources) == 2
        assert sources[0]["score"] == 0.92
        assert "preview" in sources[0]
        assert "chunk_id" in sources[0]
        assert "document_id" in sources[0]

    def test_calculate_confidence_with_results(
        self, mock_db: AsyncMock, sample_retrieval_results: list[RetrievalResult]
    ):
        engine = ConversationEngine(mock_db)
        confidence = engine._calculate_confidence(sample_retrieval_results)

        assert confidence is not None
        assert 0 < confidence <= 1.0
        # Should be weighted toward the higher score
        assert confidence > 0.85

    def test_calculate_confidence_no_results(self, mock_db: AsyncMock):
        engine = ConversationEngine(mock_db)
        confidence = engine._calculate_confidence([])
        assert confidence == 0.0

    def test_calculate_confidence_single_result(self, mock_db: AsyncMock):
        engine = ConversationEngine(mock_db)
        result = RetrievalResult(
            chunk_id="test",
            document_id="test",
            content="test",
            score=0.9,
            token_count=1,
            metadata={},
        )
        confidence = engine._calculate_confidence([result])
        assert confidence == 0.9

    @pytest.mark.asyncio
    @patch("app.services.conversation_engine.retrieve")
    @patch("app.services.conversation_engine.chat_completion")
    async def test_process_message_full_pipeline(
        self,
        mock_chat: AsyncMock,
        mock_retrieve: AsyncMock,
        mock_db: AsyncMock,
        mock_conversation: MagicMock,
        sample_retrieval_results: list[RetrievalResult],
        tenant_id: uuid.UUID,
    ):
        """Test the full message processing pipeline."""
        # Setup mocks
        mock_retrieve.return_value = sample_retrieval_results
        mock_chat.return_value = {
            "content": "Based on the documentation, you can reset your password in Settings.",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120},
        }

        # Mock DB queries
        conversation_result = MagicMock()
        conversation_result.scalar_one.return_value = mock_conversation
        conversation_result.scalar_one_or_none.return_value = mock_conversation

        messages_result = MagicMock()
        messages_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(side_effect=[
            MagicMock(),  # update message count
            conversation_result,  # get conversation
            messages_result,  # get recent messages
            MagicMock(),  # update message count (assistant)
        ])

        engine = ConversationEngine(mock_db)
        result = await engine.process_message(
            conversation_id=mock_conversation.id,
            user_message="How do I reset my password?",
            tenant_id=tenant_id,
        )

        assert result["message"] is not None
        assert result["message"].role == "assistant"
        assert result["sources"] is not None
        assert result["confidence"] is not None
        assert mock_retrieve.called
        assert mock_chat.called

    @pytest.mark.asyncio
    @patch("app.services.conversation_engine.summarize")
    async def test_summarize_conversation(
        self,
        mock_summarize: AsyncMock,
        mock_db: AsyncMock,
        mock_messages: list[MagicMock],
    ):
        """Test conversation summarization."""
        mock_summarize.return_value = "User asked about password reset. Agent provided instructions."

        messages_result = MagicMock()
        messages_result.scalars.return_value.all.return_value = mock_messages
        mock_db.execute = AsyncMock(side_effect=[
            messages_result,  # get all messages
            MagicMock(),  # update summary
        ])

        engine = ConversationEngine(mock_db)
        summary = await engine.summarize_conversation(uuid.uuid4())

        assert "password reset" in summary
        assert mock_summarize.called
