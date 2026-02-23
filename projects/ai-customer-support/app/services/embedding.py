from __future__ import annotations

import random
from typing import Any

import tiktoken

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Lazy-loaded tokenizer
_encoder: tiktoken.Encoding | None = None


def _get_encoder() -> tiktoken.Encoding:
    global _encoder
    if _encoder is None:
        _encoder = tiktoken.encoding_for_model("gpt-4o-mini")
    return _encoder


def count_tokens(text: str) -> int:
    """Count the number of tokens in a text string."""
    return len(_get_encoder().encode(text))


async def get_embedding(text: str) -> list[float]:
    """Generate an embedding vector for a single text string.

    Uses OpenAI text-embedding-3-small in production mode,
    or returns a deterministic random vector in mock mode.
    """
    if settings.is_mock_mode:
        return _mock_embedding(text)

    import openai

    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model=settings.openai_embedding_model,
        input=text,
    )
    return response.data[0].embedding


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts.

    Uses OpenAI batch embedding API in production, mock vectors otherwise.
    """
    if not texts:
        return []

    if settings.is_mock_mode:
        return [_mock_embedding(t) for t in texts]

    import openai

    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    # OpenAI allows up to 2048 inputs per batch request
    all_embeddings: list[list[float]] = []
    batch_size = 2048

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(
            model=settings.openai_embedding_model,
            input=batch,
        )
        # Sort by index to maintain order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        all_embeddings.extend([item.embedding for item in sorted_data])

    logger.info("embeddings_generated", count=len(all_embeddings))
    return all_embeddings


def _mock_embedding(text: str) -> list[float]:
    """Generate a deterministic pseudo-random embedding for testing/demo.

    Uses a hash-based seed so the same text always produces the same vector.
    """
    seed = hash(text) % (2**32)
    rng = random.Random(seed)
    vec = [rng.gauss(0, 1) for _ in range(settings.embedding_dimension)]
    # L2-normalize
    magnitude = sum(x * x for x in vec) ** 0.5
    return [x / magnitude for x in vec]
