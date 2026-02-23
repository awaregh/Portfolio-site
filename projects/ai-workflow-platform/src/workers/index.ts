import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

import { getRedis } from '../lib/redis';
import { getLogger } from '../lib/logger';
import { getConfig } from '../lib/config';
import { processStep } from './step-processor';
import { StepJobData } from '../types';
import { disconnectPrisma } from '../lib/prisma';
import { disconnectRedis } from '../lib/redis';

const logger = getLogger().child({ module: 'worker' });

let worker: Worker | null = null;

async function startWorker(): Promise<void> {
  const config = getConfig();
  const redis = getRedis();

  worker = new Worker<StepJobData>(
    'workflow-steps',
    async (job: Job<StepJobData>) => {
      const { runId, stepKey, tenantId } = job.data;
      const jobLogger = logger.child({ jobId: job.id, runId, stepKey, tenantId });

      jobLogger.info('Processing step job');

      try {
        await processStep(job.data);
        jobLogger.info('Step job completed successfully');
      } catch (err) {
        jobLogger.error({ err }, 'Step job failed');
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: config.workflow.maxConcurrentSteps,
      limiter: {
        max: 50,
        duration: 1000,
      },
    },
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Job stalled');
  });

  logger.info(
    { concurrency: config.workflow.maxConcurrentSteps },
    'Worker started and listening for jobs',
  );
}

async function shutdown(): Promise<void> {
  logger.info('Worker shutting down...');

  if (worker) {
    await worker.close();
  }

  await disconnectPrisma();
  await disconnectRedis();

  logger.info('Worker shut down cleanly');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startWorker().catch((err) => {
  logger.error({ err }, 'Failed to start worker');
  process.exit(1);
});
