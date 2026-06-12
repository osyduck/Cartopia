import { z } from "zod";

// Validated once at module load. Throws early if misconfigured.
const schema = z.object({
  METADATA_DATABASE_URL: z.url(),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 chars"),

  ADMIN_EMAIL: z.email().default("admin@cartopia.local"),
  ADMIN_PASSWORD: z.string().min(8).default("changeme123"),

  DATAPLANE_HOST: z.string().default("localhost"),
  DATAPLANE_PORT: z.coerce.number().int().default(5432),
  DATAPLANE_ADMIN_USER: z.string().default("postgres"),
  DATAPLANE_ADMIN_PASSWORD: z.string().default("dataplane_super_pw"),
  DATAPLANE_POOLER_HOST: z.string().default("localhost"),
  DATAPLANE_POOLER_PORT: z.coerce.number().int().default(6432),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("cartopia-backups"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().default(7),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
