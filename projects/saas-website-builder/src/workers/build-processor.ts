import { executeBuild } from "../services/build-engine";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const MAX_RETRIES = 3;

/**
 * Process a build job: validate, execute, and handle errors/retries.
 */
export async function processBuildJob(buildJobId: string): Promise<void> {
  const buildJob = await prisma.buildJob.findUnique({
    where: { id: buildJobId },
    include: {
      siteVersion: {
        select: { id: true, siteId: true, version: true, status: true },
      },
    },
  });

  if (!buildJob) {
    logger.error({ buildJobId }, "Build job not found, skipping");
    return;
  }

  if (buildJob.status === "COMPLETED") {
    logger.warn({ buildJobId }, "Build job already completed, skipping");
    return;
  }

  if (buildJob.retryCount >= MAX_RETRIES) {
    logger.error({ buildJobId, retries: buildJob.retryCount }, "Max retries exceeded");
    await prisma.buildJob.update({
      where: { id: buildJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: `Max retries (${MAX_RETRIES}) exceeded`,
      },
    });
    await prisma.siteVersion.update({
      where: { id: buildJob.siteVersionId },
      data: { status: "FAILED" },
    });
    return;
  }

  try {
    logger.info(
      {
        buildJobId,
        siteId: buildJob.siteVersion.siteId,
        version: buildJob.siteVersion.version,
        retry: buildJob.retryCount,
      },
      "Executing build"
    );

    await executeBuild(buildJobId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Increment retry count for potential re-queue by BullMQ
    await prisma.buildJob.update({
      where: { id: buildJobId },
      data: {
        retryCount: { increment: 1 },
        error: errorMessage,
      },
    });

    logger.error(
      {
        buildJobId,
        error: errorMessage,
        retry: buildJob.retryCount + 1,
        maxRetries: MAX_RETRIES,
      },
      "Build execution failed"
    );

    throw error; // Re-throw so BullMQ handles retry logic
  }
}
