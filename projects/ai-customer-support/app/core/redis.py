from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

_redis_pool: aioredis.Redis | None = None


async def get_redis_pool() -> aioredis.Redis:
    """Get or create the global Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


async def close_redis() -> None:
    """Close the global Redis connection pool."""
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.close()
        _redis_pool = None


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """FastAPI dependency that provides a Redis client."""
    client = await get_redis_pool()
    yield client


async def cache_get(key: str) -> Any | None:
    """Retrieve a cached value by key, returning None on miss."""
    client = await get_redis_pool()
    raw = await client.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    """Store a value in cache with an optional TTL in seconds."""
    client = await get_redis_pool()
    serialized = json.dumps(value) if not isinstance(value, str) else value
    if ttl:
        await client.setex(key, ttl, serialized)
    else:
        await client.set(key, serialized)


async def enqueue_job(queue: str, payload: dict[str, Any]) -> None:
    """Push a job payload onto a Redis list (used as a simple job queue)."""
    client = await get_redis_pool()
    await client.rpush(queue, json.dumps(payload))


async def dequeue_job(queue: str, timeout: int = 0) -> dict[str, Any] | None:
    """Pop a job from a Redis list with optional blocking timeout."""
    client = await get_redis_pool()
    result = await client.blpop(queue, timeout=timeout)
    if result is None:
        return None
    _, raw = result
    return json.loads(raw)
