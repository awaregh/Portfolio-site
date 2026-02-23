import { Router, Request, Response, NextFunction } from "express";
import { resolveSite } from "../../services/site-resolver";
import { NotFoundError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import mime from "mime-types";

const router = Router();

router.get("/:subdomain", handleServe);
router.get("/:subdomain/*", handleServe);

async function handleServe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subdomain = String(req.params.subdomain);
    const rawPath = (req.params[0] || "").replace(/^\/+/, "");
    const pagePath = rawPath === "" ? "/" : `/${rawPath}`;

    logger.debug({ subdomain, pagePath }, "Serving site content");

    // Check if this is a request for a static asset (has file extension)
    const isAsset = /\.\w+$/.test(pagePath);

    const result = await resolveSite(subdomain, pagePath);

    if (!result) {
      throw new NotFoundError("Page", pagePath);
    }

    if (isAsset) {
      const contentType = mime.lookup(pagePath) || "application/octet-stream";
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.set("Content-Type", result.contentType);
      res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    }

    res.set("X-Site-Version", result.version.toString());
    res.set("X-Served-By", "saas-website-builder");

    if (typeof result.body === "string") {
      res.send(result.body);
    } else {
      result.body.pipe(res);
    }
  } catch (error) {
    next(error);
  }
}

export default router;
