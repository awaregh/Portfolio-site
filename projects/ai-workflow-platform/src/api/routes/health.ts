import { Router, Request, Response } from 'express';
import { getPrisma } from '../../lib/prisma';
import { getRedis } from '../../lib/redis';
import { getLogger } from '../../lib/logger';

const router = Router();
const logger = getLogger().child({ module: 'health' });

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database health check
  const dbStart = Date.now();
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    checks.database = { status: 'unhealthy', latencyMs: Date.now() - dbStart, error: message };
    logger.error({ err }, 'Database health check failed');
  }

  // Redis health check
  const redisStart = Date.now();
  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = { status: 'healthy', latencyMs: Date.now() - redisStart };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    checks.redis = { status: 'unhealthy', latencyMs: Date.now() - redisStart, error: message };
    logger.error({ err }, 'Redis health check failed');
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

export default router;
