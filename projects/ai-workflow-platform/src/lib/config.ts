import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/workflow_platform'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8).default('dev-secret-change-me'),
  OPENAI_API_KEY: z.string().default(''),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }

  return {
    database: {
      url: parsed.data.DATABASE_URL,
    },
    redis: {
      url: parsed.data.REDIS_URL,
    },
    jwt: {
      secret: parsed.data.JWT_SECRET,
      expiresIn: '24h' as const,
    },
    openai: {
      apiKey: parsed.data.OPENAI_API_KEY,
      enabled: parsed.data.OPENAI_API_KEY.length > 0 && parsed.data.OPENAI_API_KEY !== 'sk-your-key-here',
    },
    server: {
      port: parsed.data.PORT,
      env: parsed.data.NODE_ENV,
      isDev: parsed.data.NODE_ENV === 'development',
      isProd: parsed.data.NODE_ENV === 'production',
      isTest: parsed.data.NODE_ENV === 'test',
    },
    logging: {
      level: parsed.data.LOG_LEVEL,
    },
    workflow: {
      maxRetries: 3,
      retryBaseDelayMs: 1000,
      maxConcurrentSteps: 10,
      stepTimeoutMs: 300_000, // 5 minutes
    },
    rateLimit: {
      windowMs: 60_000,
      maxRequests: 100,
    },
  } as const;
}

export type Config = ReturnType<typeof loadConfig>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
