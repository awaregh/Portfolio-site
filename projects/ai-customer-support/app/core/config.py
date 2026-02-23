from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "AI Customer Support Platform"
    env: str = "development"
    port: int = 8000
    log_level: str = "DEBUG"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5434/ai_support"

    # Redis
    redis_url: str = "redis://localhost:6381"

    # Auth
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440  # 24 hours

    # OpenAI
    openai_api_key: str = "sk-your-key-here"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"
    openai_summarize_model: str = "gpt-3.5-turbo"

    # pgvector
    embedding_dimension: int = 1536
    similarity_threshold: float = 0.7
    top_k_results: int = 5

    # Ingestion
    chunk_size: int = 512
    chunk_overlap: int = 64

    # Cache
    cache_ttl_seconds: int = 300  # 5 minutes
    query_cache_ttl_seconds: int = 60  # 1 minute for query results

    # Conversation
    summary_interval: int = 10  # Summarize every N messages
    max_context_messages: int = 20
    confidence_threshold: float = 0.5

    # Worker
    ingestion_queue: str = "ingestion:jobs"
    worker_poll_interval: float = 1.0

    @property
    def is_mock_mode(self) -> bool:
        """Use mock LLM/embedding when no real API key is configured."""
        return self.openai_api_key.startswith("sk-your-key") or not self.openai_api_key


settings = Settings()
