import { PrismaClient } from '@prisma/client';
import { getConfig } from './config';
import { getLogger } from './logger';

let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  const config = getConfig();
  const logger = getLogger();

  _prisma = new PrismaClient({
    datasourceUrl: config.database.url,
    log: config.server.isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
  });

  if (config.server.isDev) {
    (_prisma as any).$on('query', (e: any) => {
      logger.debug({ duration: e.duration, query: e.query }, 'prisma query');
    });
  }

  (_prisma as any).$on('error', (e: any) => {
    logger.error({ target: e.target, message: e.message }, 'prisma error');
  });

  return _prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}
