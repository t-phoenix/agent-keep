import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export type ArtifactBlob = {
  body: Buffer;
  contentType: string;
};

/** True when all R2 credentials are present. */
export function isR2Configured(cfg: R2Config | null | undefined): cfg is R2Config {
  return Boolean(
    cfg?.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket,
  );
}

export function createR2Client(cfg: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export async function r2Put(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function r2Get(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<ArtifactBlob | null> {
  try {
    const out = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    if (!out.Body) return null;
    const bytes = await out.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: out.ContentType ?? "application/octet-stream",
    };
  } catch (err: unknown) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw err;
  }
}
