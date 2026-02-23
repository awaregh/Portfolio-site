"""Pytest fixtures for async testing with mocked dependencies."""
from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import Settings


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_settings() -> Settings:
    """Provide test settings with mock mode enabled."""
    return Settings(
        database_url="postgresql+asyncpg://test:test@localhost:5434/test_db",
        redis_url="redis://localhost:6381",
        jwt_secret="test-secret-key",
        openai_api_key="sk-your-key-here",  # triggers mock mode
        env="test",
        log_level="WARNING",
    )


@pytest.fixture
def tenant_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture
def user_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture
def mock_db() -> AsyncMock:
    """Mock async database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.close = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def mock_redis() -> AsyncMock:
    """Mock async Redis client."""
    client = AsyncMock()
    client.get = AsyncMock(return_value=None)
    client.set = AsyncMock()
    client.setex = AsyncMock()
    client.rpush = AsyncMock()
    client.blpop = AsyncMock(return_value=None)
    client.ping = AsyncMock()
    client.close = AsyncMock()
    return client


@pytest.fixture
def sample_text() -> str:
    return (
        "FastAPI is a modern, fast web framework for building APIs with Python 3.7+ "
        "based on standard Python type hints. It is very high performance, on par with "
        "NodeJS and Go. It is designed to be easy to use and learn. "
        "FastAPI is built on top of Starlette for the web parts and Pydantic for the "
        "data parts. It supports async and await syntax natively. "
        "One of the key features is automatic API documentation with Swagger UI and ReDoc. "
        "FastAPI also provides dependency injection, security utilities, and much more. "
        "The framework encourages type safety and validation through Pydantic models. "
        "It has excellent community support and growing adoption in production environments."
    )


@pytest.fixture
def sample_markdown() -> str:
    return """# Getting Started

Welcome to our platform documentation.

## Installation

To install the platform, run:

```bash
pip install our-platform
```

This will install all required dependencies.

## Configuration

Configure the platform by creating a `.env` file:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `API_KEY`: Your API key

## Usage

### Basic Usage

Import and initialize the client:

```python
from our_platform import Client

client = Client(api_key="your-key")
response = client.query("How do I reset my password?")
print(response.answer)
```

### Advanced Usage

For advanced use cases, you can customize the retrieval pipeline and configure
additional parameters for more precise results.
"""


@pytest.fixture
def sample_html() -> str:
    return """
    <html>
    <head><title>Help Center</title></head>
    <body>
        <h1>Help Center</h1>
        <section>
            <h2>Getting Started</h2>
            <p>Welcome to our help center. Here you'll find answers to common questions.</p>
            <p>Our platform provides AI-powered customer support capabilities.</p>
        </section>
        <section>
            <h2>FAQ</h2>
            <div>
                <h3>How do I reset my password?</h3>
                <p>Click on the "Forgot Password" link on the login page and follow the instructions sent to your email.</p>
            </div>
            <div>
                <h3>How do I contact support?</h3>
                <p>You can reach us via email at support@example.com or through the live chat on our website.</p>
            </div>
        </section>
    </body>
    </html>
    """
