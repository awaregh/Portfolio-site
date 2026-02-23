import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { config } from "./config";
import { logger } from "./logger";

const s3Client = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
});

export async function uploadFile(
  key: string,
  body: Buffer | Readable | string,
  contentType: string
): Promise<{ key: string; size: number }> {
  const bodyBuffer = typeof body === "string" ? Buffer.from(body) : body;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    },
  });

  await upload.done();

  const size = Buffer.isBuffer(bodyBuffer) ? bodyBuffer.length : 0;
  logger.debug({ key, contentType, size }, "File uploaded to S3");

  return { key, size };
}

export async function getFile(
  key: string
): Promise<{ body: Readable; contentType: string; contentLength: number }> {
  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`Empty response body for key: ${key}`);
  }

  return {
    body: response.Body as Readable,
    contentType: response.ContentType || "application/octet-stream",
    contentLength: response.ContentLength || 0,
  };
}

export async function deletePrefix(prefix: string): Promise<number> {
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: config.S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents;

    if (!objects || objects.length === 0) break;

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: config.S3_BUCKET,
      Delete: {
        Objects: objects.map((obj) => ({ Key: obj.Key })),
        Quiet: true,
      },
    });

    await s3Client.send(deleteCommand);
    totalDeleted += objects.length;
    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  logger.info({ prefix, totalDeleted }, "Deleted S3 prefix");
  return totalDeleted;
}

export async function headObject(
  key: string
): Promise<{ exists: boolean; contentType?: string; contentLength?: number }> {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      exists: true,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === "NotFound" || err.name === "NoSuchKey") {
      return { exists: false };
    }
    throw error;
  }
}

export { s3Client };
