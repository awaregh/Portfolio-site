import { createHash } from "crypto";
import { Queue } from "bullmq";
import { prisma } from "../lib/prisma";
import { uploadFile, deletePrefix } from "../lib/s3";
import { createBullMQConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { NotFoundError, ValidationError, BuildError } from "../lib/errors";
import { renderPage } from "./renderer";
import { BuildManifest, ManifestPage, SiteSettings, PageContent } from "../types";

const BUILD_QUEUE_NAME = "site-builds";

let buildQueue: Queue | null = null;

export function getBuildQueue(): Queue {
  if (!buildQueue) {
    buildQueue = new Queue(BUILD_QUEUE_NAME, {
      connection: createBullMQConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return buildQueue;
}

/**
 * Creates a new SiteVersion and BuildJob, then enqueues for processing.
 */
export async function triggerBuild(siteId: string, userId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { _count: { select: { pages: true } } },
  });

  if (!site) {
    throw new NotFoundError("Site", siteId);
  }

  // Determine next version number
  const latestVersion = await prisma.siteVersion.findFirst({
    where: { siteId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (latestVersion?.version ?? 0) + 1;
  const s3Prefix = `sites/${site.tenantId}/${siteId}/${nextVersion}`;

  const result = await prisma.$transaction(async (tx) => {
    const siteVersion = await tx.siteVersion.create({
      data: {
        siteId,
        version: nextVersion,
        s3Prefix,
        status: "BUILDING",
        pageCount: site._count.pages,
        createdById: userId,
      },
    });

    const buildJob = await tx.buildJob.create({
      data: {
        siteVersionId: siteVersion.id,
        tenantId: site.tenantId,
        status: "QUEUED",
      },
    });

    return { siteVersion, buildJob };
  });

  // Enqueue for async processing
  await getBuildQueue().add(
    `build-${siteId}-v${nextVersion}`,
    { buildJobId: result.buildJob.id },
    { jobId: result.buildJob.id }
  );

  logger.info(
    {
      siteId,
      version: nextVersion,
      buildJobId: result.buildJob.id,
    },
    "Build enqueued"
  );

  return result;
}

/**
 * Executes the actual build: renders pages, uploads to S3, updates DB.
 */
export async function executeBuild(buildJobId: string): Promise<void> {
  const startTime = Date.now();

  const buildJob = await prisma.buildJob.findUnique({
    where: { id: buildJobId },
    include: {
      siteVersion: {
        include: {
          site: {
            include: { pages: { where: { isPublished: true }, orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (!buildJob) {
    throw new BuildError("Build job not found", buildJobId);
  }

  const { siteVersion } = buildJob;
  const { site } = siteVersion;
  const siteSettings = (site.settings ?? {}) as unknown as SiteSettings;

  // Mark as processing
  await prisma.buildJob.update({
    where: { id: buildJobId },
    data: { status: "PROCESSING", startedAt: new Date(), workerId: getWorkerId() },
  });

  try {
    const manifestPages: ManifestPage[] = [];
    let totalSize = 0;

    // 1. Render and upload each page
    for (const page of site.pages) {
      const pageContent = page.content as unknown as PageContent;
      const html = renderPage(
        {
          path: page.path,
          title: page.title,
          seoTitle: page.seoTitle ?? page.title,
          seoDescription: page.seoDescription ?? "",
          content: pageContent,
        },
        site,
        siteSettings
      );

      const pageFileName = page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`;
      const s3Key = `${siteVersion.s3Prefix}/${pageFileName}`;
      const hash = createHash("sha256").update(html).digest("hex");

      const { size } = await uploadFile(s3Key, html, "text/html; charset=utf-8");
      totalSize += size;

      manifestPages.push({
        path: page.path,
        s3Key,
        title: page.title,
        hash,
        size,
      });

      logger.debug({ s3Key, path: page.path, size }, "Page uploaded");
    }

    // 2. Generate a 404 page
    const notFoundHtml = renderPage(
      {
        path: "/404",
        title: "Page Not Found",
        seoTitle: "404 - Page Not Found",
        seoDescription: "",
        content: {
          sections: [
            {
              type: "hero",
              props: {
                heading: "404 — Page Not Found",
                subheading: "The page you're looking for doesn't exist.",
                ctaText: "Go Home",
                ctaLink: "/",
                backgroundImage: null,
                alignment: "center",
              },
            },
          ],
        },
      },
      site,
      siteSettings
    );
    const notFoundKey = `${siteVersion.s3Prefix}/404.html`;
    const { size: notFoundSize } = await uploadFile(notFoundKey, notFoundHtml, "text/html; charset=utf-8");
    totalSize += notFoundSize;

    // 3. Build manifest
    const manifest: BuildManifest = {
      version: siteVersion.version,
      siteId: site.id,
      tenantId: site.tenantId,
      generatedAt: new Date().toISOString(),
      pages: manifestPages,
      assets: [],
      totalSize,
      checksum: createHash("sha256")
        .update(manifestPages.map((p) => p.hash).join(""))
        .digest("hex"),
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestKey = `${siteVersion.s3Prefix}/manifest.json`;
    await uploadFile(manifestKey, manifestJson, "application/json");

    const buildDuration = Date.now() - startTime;

    // 4. Mark version as READY and auto-activate
    await prisma.$transaction(async (tx) => {
      await tx.siteVersion.update({
        where: { id: siteVersion.id },
        data: {
          status: "READY",
          publishedAt: new Date(),
          buildDurationMs: buildDuration,
          pageCount: manifestPages.length,
          assetSize: BigInt(totalSize),
          manifestHash: manifest.checksum,
        },
      });

      // Mark previous versions as superseded
      if (site.activeVersionId) {
        await tx.siteVersion.updateMany({
          where: {
            siteId: site.id,
            id: { not: siteVersion.id },
            status: "READY",
          },
          data: { status: "SUPERSEDED" },
        });
      }

      // Activate this version
      await tx.site.update({
        where: { id: site.id },
        data: { activeVersionId: siteVersion.id },
      });

      await tx.buildJob.update({
        where: { id: buildJobId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });

    logger.info(
      {
        siteId: site.id,
        version: siteVersion.version,
        pages: manifestPages.length,
        totalSize,
        buildDurationMs: buildDuration,
      },
      "Build completed"
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown build error";

    await prisma.$transaction(async (tx) => {
      await tx.siteVersion.update({
        where: { id: siteVersion.id },
        data: { status: "FAILED" },
      });

      await tx.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: errorMessage,
        },
      });
    });

    logger.error({ buildJobId, error: errorMessage }, "Build failed");
    throw error;
  }
}

/**
 * Atomically update a site's activeVersionId (for promoting a specific version).
 */
export async function activateVersion(siteId: string, versionId: string): Promise<void> {
  const version = await prisma.siteVersion.findFirst({
    where: { id: versionId, siteId, status: "READY" },
  });

  if (!version) {
    throw new NotFoundError("SiteVersion (READY)", versionId);
  }

  await prisma.site.update({
    where: { id: siteId },
    data: { activeVersionId: versionId },
  });

  logger.info({ siteId, versionId, version: version.version }, "Version activated");
}

/**
 * Roll back to a specific version. Validates it exists and is READY.
 */
export async function rollback(siteId: string, targetVersionId: string) {
  const targetVersion = await prisma.siteVersion.findFirst({
    where: { id: targetVersionId, siteId },
  });

  if (!targetVersion) {
    throw new NotFoundError("SiteVersion", targetVersionId);
  }

  if (targetVersion.status !== "READY" && targetVersion.status !== "SUPERSEDED") {
    throw new ValidationError(
      `Cannot rollback to version ${targetVersion.version} — status is ${targetVersion.status}`
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Re-mark target as READY
    if (targetVersion.status === "SUPERSEDED") {
      await tx.siteVersion.update({
        where: { id: targetVersionId },
        data: { status: "READY" },
      });
    }

    // Mark current active as SUPERSEDED
    const site = await tx.site.findUniqueOrThrow({ where: { id: siteId } });
    if (site.activeVersionId && site.activeVersionId !== targetVersionId) {
      await tx.siteVersion.update({
        where: { id: site.activeVersionId },
        data: { status: "SUPERSEDED" },
      });
    }

    // Point site to target version
    return tx.site.update({
      where: { id: siteId },
      data: { activeVersionId: targetVersionId },
      include: { activeVersion: true },
    });
  });

  logger.info(
    { siteId, targetVersionId, version: targetVersion.version },
    "Rollback completed"
  );

  return updated;
}

function getWorkerId(): string {
  return `worker-${process.pid}-${process.env.HOSTNAME || "local"}`;
}
