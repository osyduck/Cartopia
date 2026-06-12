import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

// MinIO-compatible S3 client for backups.
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

export const BACKUP_BUCKET = env.S3_BUCKET;
