import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./lib/config";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { errorHandler, notFoundHandler } from "./api/middleware/errorHandler";
import authRoutes from "./api/routes/auth";
import sitesRoutes from "./api/routes/sites";
import serveRoutes from "./api/routes/serve";
import healthRoutes from "./api/routes/health";

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

// ── Routes ───────────────────────────────────────────────────────────

app.use("/api/health", healthRoutes);
app.use("/api/auth", apiLimiter, authRoutes);
app.use("/api/sites", apiLimiter, sitesRoutes);
app.use("/serve", serveRoutes);

// ── Error Handling ───────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ── Server Startup ───────────────────────────────────────────────────

const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `🚀 Server running on port ${config.PORT}`
  );
});

// ── Graceful Shutdown ────────────────────────────────────────────────

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  try {
    await prisma.$disconnect();
    logger.info("Database disconnected");
  } catch (err) {
    logger.error({ err }, "Error disconnecting database");
  }

  try {
    redis.disconnect();
    logger.info("Redis disconnected");
  } catch (err) {
    logger.error({ err }, "Error disconnecting Redis");
  }

  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  process.exit(1);
});

export default app;
