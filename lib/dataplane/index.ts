import format from "pg-format";
import type { Instance } from "@/lib/db/schema";
import { adminPool, withAdmin, disposePool } from "./pool";
import { assertIdentifier } from "./identifiers";

export type AccessMode = "read" | "readwrite";

function intLimit(n: number | undefined | null): number {
  return Number.isInteger(n) ? (n as number) : -1;
}

// ─── Cluster-level operations (run against the "postgres" maintenance db) ─────

export async function createDatabase(
  instance: Instance,
  opts: {
    dbName: string;
    ownerRole: string;
    ownerPassword: string;
    connectionLimit?: number;
  },
): Promise<void> {
  assertIdentifier(opts.dbName, "database name");
  assertIdentifier(opts.ownerRole, "role name");

  const admin = adminPool(instance, "postgres");

  // 1) Dedicated owner login role.
  await admin.query(
    format(
      "CREATE ROLE %I LOGIN PASSWORD %L CONNECTION LIMIT %s",
      opts.ownerRole,
      opts.ownerPassword,
      intLimit(opts.connectionLimit),
    ),
  );

  // 2) Database owned by that role. (CREATE DATABASE cannot run in a tx.)
  try {
    await admin.query(
      format("CREATE DATABASE %I OWNER %I", opts.dbName, opts.ownerRole),
    );
  } catch (err) {
    // Roll back the orphaned role so a retry with the same name works.
    await admin
      .query(format("DROP ROLE IF EXISTS %I", opts.ownerRole))
      .catch(() => {});
    throw err;
  }

  // 3) Lock down connectivity: only the owner may connect.
  await admin.query(
    format("REVOKE CONNECT ON DATABASE %I FROM PUBLIC", opts.dbName),
  );
  await admin.query(
    format(
      "GRANT CONNECT ON DATABASE %I TO %I",
      opts.dbName,
      opts.ownerRole,
    ),
  );

  // 4) Hand the public schema to the owner and revoke PUBLIC's access.
  await withAdmin(instance, opts.dbName, async (c) => {
    await c.query(format("ALTER SCHEMA public OWNER TO %I", opts.ownerRole));
    await c.query("REVOKE ALL ON SCHEMA public FROM PUBLIC");
    await c.query(format("GRANT ALL ON SCHEMA public TO %I", opts.ownerRole));
  });
}

export async function dropDatabase(
  instance: Instance,
  dbName: string,
): Promise<void> {
  assertIdentifier(dbName, "database name");
  // Drop our own cached pool to this db first, then kick any other sessions.
  await disposePool(instance, dbName);
  await terminateConnections(instance, dbName);
  await adminPool(instance, "postgres").query(
    format("DROP DATABASE IF EXISTS %I WITH (FORCE)", dbName),
  );
}

export async function dropRoleEverywhere(
  instance: Instance,
  roleName: string,
): Promise<void> {
  assertIdentifier(roleName, "role name");
  await adminPool(instance, "postgres").query(
    format("DROP ROLE IF EXISTS %I", roleName),
  );
}

export async function setPassword(
  instance: Instance,
  roleName: string,
  password: string,
): Promise<void> {
  assertIdentifier(roleName, "role name");
  await adminPool(instance, "postgres").query(
    format("ALTER ROLE %I PASSWORD %L", roleName, password),
  );
}

export async function setConnectionLimit(
  instance: Instance,
  roleName: string,
  limit: number,
): Promise<void> {
  assertIdentifier(roleName, "role name");
  await adminPool(instance, "postgres").query(
    format("ALTER ROLE %I CONNECTION LIMIT %s", roleName, intLimit(limit)),
  );
}

/** Quota enforcement toggle. Blocks writes but allows reads + DELETE. */
export async function setDatabaseReadOnly(
  instance: Instance,
  dbName: string,
  readOnly: boolean,
): Promise<void> {
  assertIdentifier(dbName, "database name");
  await adminPool(instance, "postgres").query(
    format(
      "ALTER DATABASE %I SET default_transaction_read_only = %s",
      dbName,
      readOnly ? "on" : "off",
    ),
  );
}

export async function terminateDatabaseConnections(
  instance: Instance,
  dbName: string,
): Promise<void> {
  assertIdentifier(dbName, "database name");
  await adminPool(instance, "postgres").query(
    format(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = %L AND pid <> pg_backend_pid()`,
      dbName,
    ),
  );
}

// Internal alias kept for existing callers in this module.
const terminateConnections = terminateDatabaseConnections;

// ─── Extra login roles attached to a database ────────────────────────────────

export async function createRole(
  instance: Instance,
  opts: {
    dbName: string;
    ownerRole: string;
    roleName: string;
    password: string;
    mode: AccessMode;
    connectionLimit?: number;
  },
): Promise<void> {
  assertIdentifier(opts.dbName, "database name");
  assertIdentifier(opts.roleName, "role name");
  assertIdentifier(opts.ownerRole, "owner role");

  const admin = adminPool(instance, "postgres");
  await admin.query(
    format(
      "CREATE ROLE %I LOGIN PASSWORD %L CONNECTION LIMIT %s",
      opts.roleName,
      opts.password,
      intLimit(opts.connectionLimit),
    ),
  );
  await admin.query(
    format("GRANT CONNECT ON DATABASE %I TO %I", opts.dbName, opts.roleName),
  );
  await applyAccess(instance, opts.dbName, opts.roleName, opts.ownerRole, opts.mode);
}

/** Removes a non-owner role's access to a database, then drops the role. */
export async function removeRole(
  instance: Instance,
  opts: { dbName: string; roleName: string },
): Promise<void> {
  assertIdentifier(opts.dbName, "database name");
  assertIdentifier(opts.roleName, "role name");

  await withAdmin(instance, opts.dbName, async (c) => {
    // Drops the role's privileges and any objects it owns in this database.
    await c.query(format("DROP OWNED BY %I", opts.roleName)).catch(() => {});
  });
  const admin = adminPool(instance, "postgres");
  await admin.query(
    format("REVOKE ALL ON DATABASE %I FROM %I", opts.dbName, opts.roleName),
  );
  await admin.query(format("DROP ROLE IF EXISTS %I", opts.roleName));
}

export async function applyAccess(
  instance: Instance,
  dbName: string,
  roleName: string,
  ownerRole: string,
  mode: AccessMode,
): Promise<void> {
  assertIdentifier(dbName, "database name");
  assertIdentifier(roleName, "role name");
  assertIdentifier(ownerRole, "owner role");

  await withAdmin(instance, dbName, async (c) => {
    if (mode === "readwrite") {
      await c.query(
        format("GRANT USAGE, CREATE ON SCHEMA public TO %I", roleName),
      );
      await c.query(
        format(
          "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I",
          roleName,
        ),
      );
      await c.query(
        format(
          "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I",
          roleName,
        ),
      );
      // Future tables created by the owner are auto-granted too.
      await c.query(
        format(
          "ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I",
          ownerRole,
          roleName,
        ),
      );
      await c.query(
        format(
          "ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I",
          ownerRole,
          roleName,
        ),
      );
    } else {
      await c.query(format("GRANT USAGE ON SCHEMA public TO %I", roleName));
      await c.query(
        format(
          "GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I",
          roleName,
        ),
      );
      await c.query(
        format(
          "GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO %I",
          roleName,
        ),
      );
      await c.query(
        format(
          "ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO %I",
          ownerRole,
          roleName,
        ),
      );
    }
  });
}

// ─── Read-only introspection (sizes, metrics, health) ────────────────────────

export async function databaseSize(
  instance: Instance,
  dbName: string,
): Promise<number> {
  assertIdentifier(dbName, "database name");
  const { rows } = await adminPool(instance, "postgres").query<{
    size: string;
  }>(format("SELECT pg_database_size(%L)::bigint AS size", dbName));
  return Number(rows[0]?.size ?? 0);
}

export type DbMetrics = {
  activeConnections: number;
  totalConnections: number;
  cacheHitRatio: number | null;
  sizeBytes: number;
};

export async function databaseMetrics(
  instance: Instance,
  dbName: string,
): Promise<DbMetrics> {
  assertIdentifier(dbName, "database name");
  const admin = adminPool(instance, "postgres");

  const conn = await admin.query<{ active: string; total: string }>(
    format(
      `SELECT
         count(*) FILTER (WHERE state = 'active') AS active,
         count(*) AS total
       FROM pg_stat_activity WHERE datname = %L`,
      dbName,
    ),
  );

  const cache = await admin.query<{ ratio: string | null }>(
    format(
      `SELECT sum(blks_hit)::float / nullif(sum(blks_hit + blks_read), 0) AS ratio
         FROM pg_stat_database WHERE datname = %L`,
      dbName,
    ),
  );

  return {
    activeConnections: Number(conn.rows[0]?.active ?? 0),
    totalConnections: Number(conn.rows[0]?.total ?? 0),
    cacheHitRatio:
      cache.rows[0]?.ratio == null ? null : Number(cache.rows[0].ratio),
    sizeBytes: await databaseSize(instance, dbName),
  };
}

/** One round-trip: sizes (bytes) for every non-template database on the node. */
export async function allDatabaseSizes(
  instance: Instance,
): Promise<Map<string, number>> {
  const { rows } = await adminPool(instance, "postgres").query<{
    datname: string;
    size: string;
  }>(
    `SELECT datname, pg_database_size(datname)::bigint AS size
       FROM pg_database WHERE datistemplate = false`,
  );
  return new Map(rows.map((r) => [r.datname, Number(r.size)]));
}

export type QueryStat = {
  query: string;
  calls: number;
  totalTimeMs: number;
  meanTimeMs: number;
  rows: number;
};

export type QuerySort = "slowest" | "total" | "calls";

const QUERY_SORT_COLUMN: Record<QuerySort, string> = {
  slowest: "mean_exec_time",
  total: "total_exec_time",
  calls: "calls",
};

/**
 * Top queries for a database from pg_stat_statements (cluster-wide view,
 * filtered by dbid). Returns null if the extension isn't installed.
 */
export async function queryStats(
  instance: Instance,
  dbName: string,
  sort: QuerySort,
  limit = 15,
): Promise<QueryStat[] | null> {
  assertIdentifier(dbName, "database name");
  const orderBy = QUERY_SORT_COLUMN[sort]; // fixed whitelist, safe to inline
  try {
    const { rows } = await adminPool(instance, "postgres").query<{
      query: string;
      calls: string;
      total_exec_time: number;
      mean_exec_time: number;
      rows: string;
    }>(
      format(
        `SELECT query, calls, total_exec_time, mean_exec_time, rows
           FROM pg_stat_statements
          WHERE dbid = (SELECT oid FROM pg_database WHERE datname = %L)
          ORDER BY ${orderBy} DESC NULLS LAST
          LIMIT %s`,
        dbName,
        limit,
      ),
    );
    return rows.map((r) => ({
      query: r.query,
      calls: Number(r.calls),
      totalTimeMs: Number(r.total_exec_time),
      meanTimeMs: Number(r.mean_exec_time),
      rows: Number(r.rows),
    }));
  } catch {
    return null; // pg_stat_statements not available
  }
}

/** Major.minor PostgreSQL version string, e.g. "17.6". */
export async function serverVersion(instance: Instance): Promise<string> {
  const { rows } = await adminPool(instance, "postgres").query<{ v: string }>(
    "SELECT current_setting('server_version') AS v",
  );
  return rows[0]?.v ?? "";
}

/** Liveness probe for the Monitoring page. */
export async function pingInstance(instance: Instance): Promise<boolean> {
  try {
    await adminPool(instance, "postgres").query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
