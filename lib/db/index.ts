import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Pooled connection to Cartopia's OWN metadata database.
// Reused across hot-reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as {
  cartopiaPool?: Pool;
};

const pool =
  globalForDb.cartopiaPool ??
  new Pool({ connectionString: env.METADATA_DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.cartopiaPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
