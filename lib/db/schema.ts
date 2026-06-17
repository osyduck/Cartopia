import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  doublePrecision,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const instanceStatus = pgEnum("instance_status", [
  "online",
  "offline",
  "unreachable",
]);

export const databaseStatus = pgEnum("database_status", [
  "active",
  "suspended", // over quota -> read-only
  "deleting",
  "error",
]);

export const backupStatus = pgEnum("backup_status", [
  "pending",
  "running",
  "success",
  "failed",
]);

export const quotaEventType = pgEnum("quota_event_type", [
  "warning", // crossed soft threshold (e.g. 80%)
  "exceeded", // crossed 100% -> set read-only
  "recovered", // dropped back below -> writable again
]);

// ─── Control plane ───────────────────────────────────────────────────────────

/** Single panel admin. No roles — one level only. */
export const adminUser = pgTable("admin_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A managed PostgreSQL server (data plane node). Multi-node ready. */
export const instances = pgTable("instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(5432),
  adminUser: text("admin_user").notNull(),
  /** AES-GCM ciphertext of the admin password, keyed by APP_SECRET. */
  adminPasswordEnc: text("admin_password_enc").notNull(),
  /** Where end-user connection strings point (PgBouncer transaction mode). */
  poolerHost: text("pooler_host").notNull(),
  poolerPort: integer("pooler_port").notNull().default(6432),
  /** Session-mode pooler port (PgBouncer, session pool_mode). */
  poolerSessionPort: integer("pooler_session_port").notNull().default(6433),
  status: instanceStatus("status").notNull().default("online"),
  maxDatabases: integer("max_databases").notNull().default(100),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A provisioned database living on one instance. */
export const databases = pgTable(
  "databases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => instances.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    ownerRole: text("owner_role").notNull(),
    /** null = unlimited. */
    quotaBytes: bigint("quota_bytes", { mode: "number" }),
    status: databaseStatus("status").notNull().default("active"),
    isReadonly: boolean("is_readonly").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("databases_instance_name_uq").on(t.instanceId, t.name)],
);

/** A login role attached to a database (the owner, plus any extra users). */
export const dbRoles = pgTable(
  "db_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    roleName: text("role_name").notNull(),
    isOwner: boolean("is_owner").notNull().default(false),
    /** AES-GCM ciphertext of the role's password (so it can be shown again). */
    passwordEnc: text("password_enc"),
    connectionLimit: integer("connection_limit").notNull().default(-1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("db_roles_name_uq").on(t.databaseId, t.roleName)],
);

/** Periodic on-disk size samples, for quota + storage charts. */
export const usageSnapshots = pgTable(
  "usage_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("usage_db_time_idx").on(t.databaseId, t.capturedAt)],
);

/** Periodic monitoring metrics for the Monitoring page. */
export const metricSnapshots = pgTable(
  "metric_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    activeConnections: integer("active_connections").notNull(),
    cacheHitRatio: doublePrecision("cache_hit_ratio"),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("metric_db_time_idx").on(t.databaseId, t.capturedAt)],
);

/** Audit trail of quota state transitions. */
export const quotaEvents = pgTable("quota_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  databaseId: uuid("database_id")
    .notNull()
    .references(() => databases.id, { onDelete: "cascade" }),
  type: quotaEventType("type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  quotaBytes: bigint("quota_bytes", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One row per backup attempt (daily, 7-day rolling retention). */
export const backups = pgTable(
  "backups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    location: text("location"), // S3 object key, set once uploaded
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    status: backupStatus("status").notNull().default("pending"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("backups_db_time_idx").on(t.databaseId, t.createdAt)],
);

/** Every mutating action taken through the panel. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor: text("actor").notNull(), // admin email
    action: text("action").notNull(), // e.g. "database.create"
    target: text("target"), // e.g. db name / role name
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_time_idx").on(t.createdAt)],
);

// ─── Inferred types ──────────────────────────────────────────────────────────

export type Instance = typeof instances.$inferSelect;
export type DatabaseRow = typeof databases.$inferSelect;
export type DbRole = typeof dbRoles.$inferSelect;
export type Backup = typeof backups.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;
export type UsageSnapshot = typeof usageSnapshots.$inferSelect;
