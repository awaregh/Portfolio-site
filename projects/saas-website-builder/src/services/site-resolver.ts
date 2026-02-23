import { Readable } from "stream";
import { prisma } from "../lib/prisma";
import { getFile } from "../lib/s3";
import { logger } from "../lib/logger";

interface ResolvedContent {
  body: Readable | string;
  contentType: string;
  version: number;
}

// Simple in-memory cache with TTL
interface CacheEntry {
  siteId: string;
  activeVersionId: string;
  s3Prefix: string;
  version: number;
  expiresAt: number;
}

const siteCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCachedSite(subdomain: string): CacheEntry | null {
  const entry = siteCache.get(subdomain);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    siteCache.delete(subdomain);
    return null;
  }
  return entry;
}

function setCachedSite(subdomain: string, entry: Omit<CacheEntry, "expiresAt">): void {
  siteCache.set(subdomain, {
    ...entry,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Resolves a subdomain + path to a built artifact from S3.
 */
export async function resolveSite(
  subdomain: string,
  path: string
): Promise<ResolvedContent | null> {
  // 1. Look up site (cached)
  let siteInfo = getCachedSite(subdomain);

  if (!siteInfo) {
    const site = await prisma.site.findUnique({
      where: { subdomain },
      include: {
        activeVersion: { select: { id: true, version: true, s3Prefix: true } },
      },
    });

    if (!site || !site.activeVersion) {
      logger.debug({ subdomain }, "Site not found or no active version");
      return null;
    }

    siteInfo = {
      siteId: site.id,
      activeVersionId: site.activeVersion.id,
      s3Prefix: site.activeVersion.s3Prefix,
      version: site.activeVersion.version,
      expiresAt: 0,
    };

    setCachedSite(subdomain, siteInfo);
  }

  // 2. Determine S3 key from path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isAsset = /\.\w+$/.test(normalizedPath);
  let s3Key: string;

  if (isAsset) {
    // Static asset: /css/style.css → {prefix}/css/style.css
    s3Key = `${siteInfo.s3Prefix}${normalizedPath}`;
  } else {
    // Page: / → {prefix}/index.html, /about → {prefix}/about/index.html
    const pageFile = normalizedPath === "/" ? "index.html" : `${normalizedPath.slice(1)}/index.html`;
    s3Key = `${siteInfo.s3Prefix}/${pageFile}`;
  }

  // 3. Fetch from S3
  try {
    const file = await getFile(s3Key);
    return {
      body: file.body,
      contentType: file.contentType,
      version: siteInfo.version,
    };
  } catch (error: unknown) {
    const err = error as { name?: string; Code?: string };
    if (err.name === "NoSuchKey" || err.Code === "NoSuchKey") {
      // Try serving 404 page
      if (!path.endsWith("/404")) {
        try {
          const notFoundKey = `${siteInfo.s3Prefix}/404.html`;
          const file = await getFile(notFoundKey);
          return {
            body: file.body,
            contentType: file.contentType,
            version: siteInfo.version,
          };
        } catch {
          // 404 page also not found
        }
      }
      return null;
    }
    throw error;
  }
}

/**
 * Invalidate cache for a specific subdomain (call after publish/rollback).
 */
export function invalidateCache(subdomain: string): void {
  siteCache.delete(subdomain);
}

/**
 * Clear the entire site resolution cache.
 */
export function clearCache(): void {
  siteCache.clear();
}
