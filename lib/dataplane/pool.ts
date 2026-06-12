import { Pool, type PoolClient } from "pg";
import type { Instance } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto";

// Admin connection pools to data-plane instances, keyed by instance + database.
// Cached on globalThis so Next's dev hot-reload doesn't leak connections.
const globalForPools = globalThis as unknown as {
  cartopiaAdminPools?: Map<string, Pool>;
};

const pools = (globalForPools.cartopiaAdminPools ??= new Map<string, Pool>());

export function adminPool(instance: Instance, database = "postgres"): Pool {
  const key = `${instance.id}:${database}`;
  let pool = pools.get(key);
  if (!pool) {
    pool = new Pool({
      host: instance.host,
      port: instance.port,
      user: instance.adminUser,
      password: decryptSecret(instance.adminPasswordEnc),
      database,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      application_name: "cartopia-control-plane",
    });
    // Idle backends get terminated whenever we drop a database or kick
    // sessions for quota enforcement. Without this listener pg would throw
    // an unhandled 'error' and crash the process.
    pool.on("error", (err) => {
      console.warn(`[dataplane] idle client error on ${key}: ${err.message}`);
    });
    pools.set(key, pool);
  }
  return pool;
}

/** Closes and forgets the cached pool for a database (e.g. before drop). */
export async function disposePool(
  instance: Instance,
  database: string,
): Promise<void> {
  const key = `${instance.id}:${database}`;
  const pool = pools.get(key);
  if (pool) {
    pools.delete(key);
    await pool.end().catch(() => {});
  }
}

/** Run `fn` with an admin client bound to `database`, always releasing it. */
export async function withAdmin<T>(
  instance: Instance,
  database: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await adminPool(instance, database).connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
