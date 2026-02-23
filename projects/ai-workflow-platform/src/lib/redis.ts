import Redis from 'ioredis';
import { getConfig } from './config';
import { getLogger } from './logger';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const config = getConfig();
  const logger = getLogger();

  _redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      logger.warn({ attempt: times, delay }, 'Redis reconnecting');
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  _redis.on('connect', () => {
    logger.info('Redis connected');
  });

  _redis.on('error', (err: Error) => {
    logger.error({ err }, 'Redis error');
  });

  _redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return _redis;
}

export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
