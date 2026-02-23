from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def chat_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> dict[str, Any]:
    """Call OpenAI Chat Completion API or return a mock response.

    Returns a dict with 'content', 'model', and 'usage' keys.
    """
    model = model or settings.openai_chat_model

    if settings.is_mock_mode:
        return _mock_chat_completion(messages, model)

    import openai

    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    choice = response.choices[0]
    usage = response.usage

    logger.info(
        "llm_call_completed",
        model=model,
        prompt_tokens=usage.prompt_tokens if usage else 0,
        completion_tokens=usage.completion_tokens if usage else 0,
    )

    return {
        "content": choice.message.content or "",
        "model": model,
        "usage": {
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
        },
    }


async def summarize(text: str) -> str:
    """Summarize a block of text using a smaller/cheaper model."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a concise summarizer. Summarize the following conversation "
                "in 2-3 sentences, capturing the key topics and any unresolved questions."
            ),
        },
        {"role": "user", "content": text},
    ]

    result = await chat_completion(
        messages=messages,
        model=settings.openai_summarize_model,
        temperature=0.2,
        max_tokens=256,
    )
    return result["content"]


def _mock_chat_completion(
    messages: list[dict[str, str]], model: str
) -> dict[str, Any]:
    """Generate a structured mock response for demo/testing."""
    user_messages = [m for m in messages if m.get("role") == "user"]
    last_user_msg = user_messages[-1]["content"] if user_messages else "your question"

    # Check if context was provided in system message
    has_context = any(
        "context" in m.get("content", "").lower()
        for m in messages
        if m.get("role") == "system"
    )

    if has_context:
        content = (
            f"Based on the available documentation, here's what I found regarding "
            f"your question about '{last_user_msg[:80]}':\n\n"
            f"The documentation indicates that this topic is covered in our knowledge base. "
            f"The relevant information suggests a resolution is available.\n\n"
            f"**Key points:**\n"
            f"1. This is addressed in our documentation\n"
            f"2. The recommended approach follows best practices\n"
            f"3. Please let me know if you need more specific details\n\n"
            f"Is there anything else I can help you with?"
        )
    else:
        content = (
            f"I understand you're asking about '{last_user_msg[:80]}'. "
            f"I don't have specific documentation on this topic in my knowledge base. "
            f"I'd recommend checking our help center or reaching out to a human agent "
            f"for more detailed assistance."
        )

    mock_tokens = len(content.split()) * 2  # rough estimate

    return {
        "content": content,
        "model": model,
        "usage": {
            "prompt_tokens": sum(len(m.get("content", "").split()) for m in messages) * 2,
            "completion_tokens": mock_tokens,
            "total_tokens": mock_tokens,
        },
    }
