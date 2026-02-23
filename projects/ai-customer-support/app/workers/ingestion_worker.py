"""Background worker that processes document ingestion jobs from a Redis queue.

Usage:
    python -m app.workers.ingestion_worker
"""
from __future__ import annotations

import asyncio
import signal
import sys

from app.core.config import settings
from app.core.database import async_session_factory, close_db, init_db
from app.core.logging import get_logger, setup_logging
from app.core.redis import close_redis, dequeue_job
from app.services.ingestion import ingest_document

logger = get_logger(__name__)

_shutdown = False


def _handle_signal(signum: int, frame: object) -> None:
    """Handle graceful shutdown signals."""
    global _shutdown
    logger.info("shutdown_signal_received", signal=signum)
    _shutdown = True


async def run_worker() -> None:
    """Main worker loop: poll Redis for ingestion jobs and process them."""
    setup_logging()
    logger.info("ingestion_worker_starting", queue=settings.ingestion_queue)

    # Initialize database
    await init_db()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    retry_delays = [1, 2, 5, 10, 30]  # Exponential backoff for retries

    while not _shutdown:
        try:
            job = await dequeue_job(settings.ingestion_queue, timeout=int(settings.worker_poll_interval))

            if job is None:
                continue

            document_id = job.get("document_id")
            tenant_id = job.get("tenant_id")

            if not document_id:
                logger.warning("invalid_job_payload", job=job)
                continue

            logger.info(
                "processing_job",
                document_id=document_id,
                tenant_id=tenant_id,
            )

            # Process with retry logic
            last_error: Exception | None = None
            for attempt, delay in enumerate(retry_delays):
                try:
                    async with async_session_factory() as session:
                        await ingest_document(document_id, session)
                    logger.info("job_completed", document_id=document_id)
                    last_error = None
                    break
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "job_retry",
                        document_id=document_id,
                        attempt=attempt + 1,
                        error=str(exc),
                        next_delay=delay,
                    )
                    await asyncio.sleep(delay)

            if last_error is not None:
                logger.error(
                    "job_failed_permanently",
                    document_id=document_id,
                    error=str(last_error),
                )

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("worker_error", error=str(exc))
            await asyncio.sleep(settings.worker_poll_interval)

    # Cleanup
    await close_redis()
    await close_db()
    logger.info("ingestion_worker_stopped")


if __name__ == "__main__":
    asyncio.run(run_worker())
