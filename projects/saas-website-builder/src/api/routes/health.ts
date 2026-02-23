import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  // Redis
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  const status = healthy ? 200 : 503;

  res.status(status).json({
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

export default router;
