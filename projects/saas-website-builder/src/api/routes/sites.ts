import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../../lib/errors";
import { logger } from "../../lib/logger";
import { triggerBuild, activateVersion, rollback } from "../../services/build-engine";

const router = Router();

router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────

function tenantId(req: Request): string {
  return req.auth!.tenantId;
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createSiteSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  subdomain: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  settings: z.record(z.unknown()).optional(),
});

const updateSiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.unknown()).optional(),
  customDomain: z.string().max(255).nullable().optional(),
});

const createPageSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(512)
    .regex(/^\//, "Path must start with /"),
  title: z.string().min(1).max(255),
  content: z.record(z.unknown()).default({}),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().max(512).optional(),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
  seoTitle: z.string().max(255).nullable().optional(),
  seoDescription: z.string().max(512).nullable().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const rollbackSchema = z.object({
  versionId: z.string().uuid(),
});

// ── Site CRUD ────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [sites, total] = await Promise.all([
      prisma.site.findMany({
        where: { tenantId: tenantId(req) },
        include: {
          activeVersion: {
            select: { id: true, version: true, status: true, publishedAt: true },
          },
          _count: { select: { pages: true, versions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.site.count({ where: { tenantId: tenantId(req) } }),
    ]);

    res.json({
      data: sites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSiteSchema.parse(req.body);

    const existingSubdomain = await prisma.site.findUnique({
      where: { subdomain: data.subdomain },
    });
    if (existingSubdomain) {
      throw new ConflictError("Subdomain is already taken");
    }

    const existingSlug = await prisma.site.findUnique({
      where: { tenantId_slug: { tenantId: tenantId(req), slug: data.slug } },
    });
    if (existingSlug) {
      throw new ConflictError("Slug is already used in this tenant");
    }

    const site = await prisma.site.create({
      data: {
        tenantId: tenantId(req),
        name: data.name,
        slug: data.slug,
        subdomain: data.subdomain,
        settings: (data.settings ?? {}) as Prisma.InputJsonValue,
      },
    });

    logger.info({ siteId: site.id, tenantId: tenantId(req) }, "Site created");
    res.status(201).json({ data: site });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
      include: {
        activeVersion: true,
        _count: { select: { pages: true, versions: true } },
      },
    });

    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    res.json({ data: site });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateSiteSchema.parse(req.body);

    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    const updated = await prisma.site.update({
      where: { id: req.params.id as string },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.settings && { settings: data.settings as Prisma.InputJsonValue }),
        ...(data.customDomain !== undefined && { customDomain: data.customDomain }),
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    await prisma.site.delete({ where: { id: req.params.id as string } });

    logger.info({ siteId: req.params.id as string }, "Site deleted");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── Publish & Rollback ───────────────────────────────────────────────

router.post("/:id/publish", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
      include: { _count: { select: { pages: true } } },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    if (site._count.pages === 0) {
      throw new ValidationError("Cannot publish a site with no pages");
    }

    const result = await triggerBuild(req.params.id as string, req.auth!.userId);

    logger.info(
      { siteId: req.params.id as string, versionId: result.siteVersion.id },
      "Build triggered"
    );

    res.status(202).json({
      data: {
        siteVersion: result.siteVersion,
        buildJob: result.buildJob,
        message: "Build queued successfully",
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/rollback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionId } = rollbackSchema.parse(req.body);

    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    const updated = await rollback(req.params.id as string, versionId);

    logger.info(
      { siteId: req.params.id as string, versionId },
      "Site rolled back"
    );

    res.json({
      data: updated,
      message: "Rollback completed successfully",
    });
  } catch (error) {
    next(error);
  }
});

// ── Versions ─────────────────────────────────────────────────────────

router.get("/:id/versions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    const [versions, total] = await Promise.all([
      prisma.siteVersion.findMany({
        where: { siteId: req.params.id as string },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          buildJobs: {
            select: { id: true, status: true, error: true },
            orderBy: { retryCount: "desc" },
            take: 1,
          },
        },
        orderBy: { version: "desc" },
        skip,
        take: limit,
      }),
      prisma.siteVersion.count({ where: { siteId: req.params.id as string } }),
    ]);

    res.json({
      data: versions.map((v) => ({
        ...v,
        isActive: site.activeVersionId === v.id,
        assetSize: v.assetSize.toString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ── Pages ────────────────────────────────────────────────────────────

router.get("/:id/pages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where: { siteId: req.params.id as string },
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit,
      }),
      prisma.page.count({ where: { siteId: req.params.id as string } }),
    ]);

    res.json({
      data: pages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/pages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPageSchema.parse(req.body);

    const site = await prisma.site.findFirst({
      where: { id: req.params.id as string, tenantId: tenantId(req) },
    });
    if (!site) {
      throw new NotFoundError("Site", req.params.id as string);
    }

    const existingPage = await prisma.page.findUnique({
      where: { siteId_path: { siteId: req.params.id as string, path: data.path } },
    });
    if (existingPage) {
      throw new ConflictError(`A page with path '${data.path}' already exists`);
    }

    const pageRecord = await prisma.page.create({
      data: {
        siteId: req.params.id as string,
        path: data.path,
        title: data.title,
        content: data.content as Prisma.InputJsonValue,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        isPublished: data.isPublished,
        sortOrder: data.sortOrder,
      },
    });

    res.status(201).json({ data: pageRecord });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id/pages/:pageId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updatePageSchema.parse(req.body);

      const site = await prisma.site.findFirst({
        where: { id: req.params.id as string, tenantId: tenantId(req) },
      });
      if (!site) {
        throw new NotFoundError("Site", req.params.id as string);
      }

      const page = await prisma.page.findFirst({
        where: { id: req.params.pageId as string, siteId: req.params.id as string },
      });
      if (!page) {
        throw new NotFoundError("Page", req.params.pageId as string);
      }

      const { content, ...rest } = data;

      const updated = await prisma.page.update({
        where: { id: req.params.pageId as string },
        data: {
          ...rest,
          ...(content && { content: content as Prisma.InputJsonValue }),
        },
      });

      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/pages/:pageId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const site = await prisma.site.findFirst({
        where: { id: req.params.id as string, tenantId: tenantId(req) },
      });
      if (!site) {
        throw new NotFoundError("Site", req.params.id as string);
      }

      const page = await prisma.page.findFirst({
        where: { id: req.params.pageId as string, siteId: req.params.id as string },
      });
      if (!page) {
        throw new NotFoundError("Page", req.params.pageId as string);
      }

      await prisma.page.delete({ where: { id: req.params.pageId as string } });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
