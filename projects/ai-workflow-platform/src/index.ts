import dotenv from 'dotenv';

// Load environment variables before anything else
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import { getConfig } from './lib/config';
import { getLogger } from './lib/logger';
import { disconnectPrisma } from './lib/prisma';
import { disconnectRedis } from './lib/redis';
import { errorHandler } from './api/middleware/errorHandler';
import { wsService } from './services/websocket';

import authRoutes from './api/routes/auth';
import workflowRoutes from './api/routes/workflows';
import runRoutes from './api/routes/runs';
import healthRoutes from './api/routes/health';

const config = getConfig();
const logger = getLogger();

// ── Express App ─────────────────────────────────────────────────────
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.server.isDev ? '*' : undefined,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later' },
  },
});
app.use('/api', limiter);

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ── API Routes ──────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/runs', runRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ── HTTP Server + WebSocket ─────────────────────────────────────────
const server = createServer(app);

// Attach WebSocket server
wsService.attach(server);

server.listen(config.server.port, () => {
  logger.info(
    {
      port: config.server.port,
      env: config.server.env,
      openai: config.openai.enabled ? 'enabled' : 'mock',
    },
    `🚀 AI Workflow Platform running on port ${config.server.port}`,
  );
});

// ── Graceful Shutdown ───────────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal');

  // Close WebSocket connections
  wsService.close();

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Disconnect services
  await disconnectPrisma();
  await disconnectRedis();

  logger.info('All connections closed. Goodbye!');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

export { app, server };
