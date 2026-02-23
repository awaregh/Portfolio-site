from __future__ import annotations

import uuid
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models.conversation import Conversation, Message
from app.services.embedding import count_tokens
from app.services.llm import chat_completion, summarize
from app.services.retriever import RetrievalResult, retrieve

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are a helpful AI customer support assistant. Your role is to help customers
by answering their questions using the provided context from the company's documentation.

Rules:
- Only answer based on the provided context. If the context doesn't contain relevant information, say so.
- Be concise and professional.
- Cite your sources when possible by referencing the document section.
- If you're not confident in your answer, mention that a human agent might provide better assistance.

Context from documentation:
{context}

Previous conversation summary:
{summary}"""


class ConversationEngine:
    """Orchestrates the RAG-powered conversation flow."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def process_message(
        self,
        conversation_id: UUID,
        user_message: str,
        tenant_id: UUID,
    ) -> dict[str, Any]:
        """Process a user message through the full RAG pipeline.

        1. Store user message
        2. Retrieve relevant context via retriever
        3. Build prompt with conversation history + retrieved context + system instructions
        4. Call LLM
        5. Parse response, extract sources
        6. Calculate confidence based on retrieval scores
        7. Store assistant message with sources
        8. If confidence below threshold, add disclaimer
        9. Every N turns, trigger rolling summary
        10. Return response with sources and confidence
        """
        # Step 1: Store user message
        user_msg = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            role="user",
            content=user_message,
            token_count=count_tokens(user_message),
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Update conversation message count
        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(message_count=Conversation.message_count + 1)
        )

        # Step 2: Retrieve relevant context
        retrieval_results = await retrieve(
            query=user_message,
            tenant_id=tenant_id,
            db=self.db,
        )

        # Step 3: Build prompt
        context_text = self._build_context(retrieval_results)
        conversation = await self._get_conversation(conversation_id)
        history = await self._get_recent_messages(conversation_id)

        system_message = SYSTEM_PROMPT.format(
            context=context_text or "No relevant documentation found.",
            summary=conversation.summary or "No previous conversation summary.",
        )

        messages = [{"role": "system", "content": system_message}]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})

        # Step 4: Call LLM
        llm_response = await chat_completion(messages=messages)
        assistant_content = llm_response["content"]

        # Step 5 & 6: Extract sources and calculate confidence
        sources = self._extract_sources(retrieval_results)
        confidence = self._calculate_confidence(retrieval_results)

        # Step 8: Add disclaimer if confidence is low
        if confidence is not None and confidence < settings.confidence_threshold:
            assistant_content += (
                "\n\n⚠️ *I'm not fully confident in this answer based on the available "
                "documentation. You may want to verify with a human support agent.*"
            )

        # Step 7: Store assistant message
        total_tokens = llm_response.get("usage", {}).get("completion_tokens", 0)
        assistant_msg = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            tenant_id=tenant_id,
            role="assistant",
            content=assistant_content,
            sources=sources,
            confidence=confidence,
            token_count=total_tokens or count_tokens(assistant_content),
        )
        self.db.add(assistant_msg)

        # Update conversation message count again for assistant message
        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(message_count=Conversation.message_count + 1)
        )
        await self.db.flush()

        # Step 9: Trigger rolling summary every N messages
        if conversation.message_count > 0 and conversation.message_count % settings.summary_interval == 0:
            try:
                await self.summarize_conversation(conversation_id)
            except Exception as exc:
                logger.warning("summary_failed", conversation_id=str(conversation_id), error=str(exc))

        logger.info(
            "message_processed",
            conversation_id=str(conversation_id),
            confidence=confidence,
            sources_count=len(sources) if sources else 0,
        )

        return {
            "message": assistant_msg,
            "sources": sources,
            "confidence": confidence,
            "retrieval_results": retrieval_results,
        }

    async def summarize_conversation(self, conversation_id: UUID) -> str:
        """Generate a rolling summary of the conversation so far."""
        messages = await self._get_all_messages(conversation_id)
        if not messages:
            return ""

        transcript = "\n".join(
            f"{msg.role.upper()}: {msg.content}" for msg in messages
        )

        summary_text = await summarize(transcript)

        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(summary=summary_text)
        )
        await self.db.flush()

        logger.info("conversation_summarized", conversation_id=str(conversation_id))
        return summary_text

    def _build_context(self, results: list[RetrievalResult]) -> str:
        """Build context string from retrieval results."""
        if not results:
            return ""

        parts: list[str] = []
        for i, result in enumerate(results, 1):
            source_info = ""
            if result.metadata:
                section = result.metadata.get("section", "")
                if section:
                    source_info = f" (Section: {section})"

            parts.append(
                f"[Source {i}{source_info}] (relevance: {result.score:.2f})\n{result.content}"
            )

        return "\n\n---\n\n".join(parts)

    def _extract_sources(self, results: list[RetrievalResult]) -> list[dict[str, Any]]:
        """Extract source citations from retrieval results."""
        return [
            {
                "chunk_id": r.chunk_id,
                "document_id": r.document_id,
                "score": round(r.score, 3),
                "preview": r.content[:200],
                "metadata": r.metadata,
            }
            for r in results
        ]

    def _calculate_confidence(self, results: list[RetrievalResult]) -> float | None:
        """Calculate confidence score based on retrieval quality."""
        if not results:
            return 0.0

        # Weighted average of top scores (top result weighted more)
        scores = [r.score for r in results]
        if len(scores) == 1:
            return scores[0]

        weights = [1.0 / (i + 1) for i in range(len(scores))]
        total_weight = sum(weights)
        weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight

        return round(weighted_score, 3)

    async def _get_conversation(self, conversation_id: UUID) -> Conversation:
        """Fetch the conversation from DB."""
        result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one()

    async def _get_recent_messages(
        self, conversation_id: UUID, limit: int | None = None
    ) -> list[Message]:
        """Get the most recent messages for context window."""
        limit = limit or settings.max_context_messages
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = list(result.scalars().all())
        messages.reverse()  # Chronological order
        return messages

    async def _get_all_messages(self, conversation_id: UUID) -> list[Message]:
        """Get all messages for a conversation (for summarization)."""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())
