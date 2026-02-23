import { Worker } from "bullmq";
import { createBullMQConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { processBuildJob } from "./build-processor";

const BUILD_QUEUE_NAME = "site-builds";

logger.info("Starting build worker...");

const worker = new Worker(
  BUILD_QUEUE_NAME,
  async (job) => {
    const { buildJobId } = job.data as { buildJobId: string };
    logger.info({ jobId: job.id, buildJobId }, "Processing build job");
    await processBuildJob(buildJobId);
  },
  {
    connection: createBullMQConnection(),
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60_000,
    },
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Build job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error: error.message }, "Build job failed");
});

worker.on("error", (error) => {
  logger.error({ error: error.message }, "Worker error");
});

worker.on("stalled", (jobId) => {
  logger.warn({ jobId }, "Build job stalled");
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Worker shutting down...");
  await worker.close();
  logger.info("Worker shut down gracefully");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

logger.info({ concurrency: 2, queue: BUILD_QUEUE_NAME }, "Build worker ready");
