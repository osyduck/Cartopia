import { defineConfig } from "drizzle-kit";

// drizzle-kit does not auto-load .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to ambient env (e.g. CI)
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.METADATA_DATABASE_URL!,
  },
});
