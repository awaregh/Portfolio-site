import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

prisma.$on("error" as never, (e: unknown) => {
  logger.error(e, "Prisma error");
});

prisma.$on("warn" as never, (e: unknown) => {
  logger.warn(e, "Prisma warning");
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
