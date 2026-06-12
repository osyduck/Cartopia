import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  databases,
  dbRoles,
  instances,
  type Instance,
  type DatabaseRow,
  type DbRole,
} from "@/lib/db/schema";
import * as dp from "@/lib/dataplane";
import { generatePassword } from "@/lib/crypto";
import { assertIdentifier } from "@/lib/dataplane/identifiers";
import { writeAudit } from "@/lib/audit";

export type AccessMode = dp.AccessMode;

/** Build a libpq URL pointed at the instance's pooler. */
export function connectionString(opts: {
  instance: Instance;
  dbName: string;
  role: string;
  password?: string;
}): string {
  const auth = opts.password
    ? `${opts.role}:${encodeURIComponent(opts.password)}`
    : opts.role;
  return `postgresql://${auth}@${opts.instance.poolerHost}:${opts.instance.poolerPort}/${opts.dbName}`;
}

/** Picks the online instance currently hosting the fewest databases. */
async function pickInstance(): Promise<Instance> {
  const rows = await db
    .select({
      instance: instances,
      count: sql<number>`count(${databases.id})::int`,
    })
    .from(instances)
    .leftJoin(databases, eq(databases.instanceId, instances.id))
    .where(eq(instances.status, "online"))
    .groupBy(instances.id)
    .orderBy(sql`count(${databases.id})`)
    .limit(1);

  if (!rows[0]) throw new Error("No online data-plane instance available.");
  return rows[0].instance;
}

export async function getInstance(id: string): Promise<Instance | undefined> {
  const [row] = await db
    .select()
    .from(instances)
    .where(eq(instances.id, id))
    .limit(1);
  return row;
}

export type DatabaseListItem = DatabaseRow & {
  instanceName: string;
  sizeBytes: number | null;
};

export async function listDatabases(): Promise<DatabaseListItem[]> {
  const rows = await db
    .select({ database: databases, instanceName: instances.name })
    .from(databases)
    .innerJoin(instances, eq(databases.instanceId, instances.id))
    .orderBy(desc(databases.createdAt));

  // Live sizes, one query per distinct instance.
  const sizeCache = new Map<string, Map<string, number>>();
  const result: DatabaseListItem[] = [];
  for (const row of rows) {
    let sizes = sizeCache.get(row.database.instanceId);
    if (!sizes) {
      const inst = await getInstance(row.database.instanceId);
      sizes = inst
        ? await dp.allDatabaseSizes(inst).catch(() => new Map())
        : new Map();
      sizeCache.set(row.database.instanceId, sizes);
    }
    result.push({
      ...row.database,
      instanceName: row.instanceName,
      sizeBytes: sizes.get(row.database.name) ?? null,
    });
  }
  return result;
}

export type DatabaseDetail = {
  database: DatabaseRow;
  instance: Instance;
  roles: DbRole[];
  sizeBytes: number | null;
};

export async function getDatabaseDetail(
  id: string,
): Promise<DatabaseDetail | null> {
  const [row] = await db
    .select()
    .from(databases)
    .where(eq(databases.id, id))
    .limit(1);
  if (!row) return null;

  const instance = await getInstance(row.instanceId);
  if (!instance) return null;

  const roles = await db
    .select()
    .from(dbRoles)
    .where(eq(dbRoles.databaseId, id))
    .orderBy(desc(dbRoles.isOwner), dbRoles.roleName);

  const sizeBytes = await dp
    .databaseSize(instance, row.name)
    .catch(() => null);

  return { database: row, instance, roles, sizeBytes };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export type ProvisionResult = {
  databaseId: string;
  ownerRole: string;
  password: string;
  connectionString: string;
};

export async function provisionDatabase(opts: {
  name: string;
  quotaBytes: number | null;
  connectionLimit: number;
  actor: string;
}): Promise<ProvisionResult> {
  const name = opts.name.toLowerCase();
  assertIdentifier(name, "database name");
  const ownerRole = `${name}_owner`;
  assertIdentifier(ownerRole, "owner role name");

  const instance = await pickInstance();
  const password = generatePassword();

  await dp.createDatabase(instance, {
    dbName: name,
    ownerRole,
    ownerPassword: password,
    connectionLimit: opts.connectionLimit,
  });

  const [inserted] = await db
    .insert(databases)
    .values({
      instanceId: instance.id,
      name,
      ownerRole,
      quotaBytes: opts.quotaBytes,
    })
    .returning({ id: databases.id });

  await db.insert(dbRoles).values({
    databaseId: inserted.id,
    roleName: ownerRole,
    isOwner: true,
    connectionLimit: opts.connectionLimit,
  });

  await writeAudit({
    actor: opts.actor,
    action: "database.create",
    target: name,
    metadata: { instance: instance.name, quotaBytes: opts.quotaBytes },
  });

  return {
    databaseId: inserted.id,
    ownerRole,
    password,
    connectionString: connectionString({
      instance,
      dbName: name,
      role: ownerRole,
      password,
    }),
  };
}

export async function deleteDatabase(
  id: string,
  actor: string,
): Promise<void> {
  const detail = await getDatabaseDetail(id);
  if (!detail) return;
  const { database, instance, roles } = detail;

  await dp.dropDatabase(instance, database.name);
  // Drop every login role that belonged to this database.
  for (const role of roles) {
    await dp.dropRoleEverywhere(instance, role.roleName).catch(() => {});
  }

  await db.delete(databases).where(eq(databases.id, id)); // cascades db_roles

  await writeAudit({
    actor,
    action: "database.delete",
    target: database.name,
    metadata: { instance: instance.name },
  });
}

export async function setReadOnly(
  id: string,
  readOnly: boolean,
  actor: string,
): Promise<void> {
  const detail = await getDatabaseDetail(id);
  if (!detail) return;
  const { database, instance } = detail;

  await dp.setDatabaseReadOnly(instance, database.name, readOnly);
  await db
    .update(databases)
    .set({
      isReadonly: readOnly,
      status: readOnly ? "suspended" : "active",
    })
    .where(eq(databases.id, id));

  await writeAudit({
    actor,
    action: readOnly ? "database.readonly_on" : "database.readonly_off",
    target: database.name,
  });
}

export type AddRoleResult = {
  roleName: string;
  password: string;
  connectionString: string;
};

export async function addRole(opts: {
  databaseId: string;
  roleName: string;
  mode: AccessMode;
  connectionLimit: number;
  actor: string;
}): Promise<AddRoleResult> {
  const roleName = opts.roleName.toLowerCase();
  assertIdentifier(roleName, "role name");

  const detail = await getDatabaseDetail(opts.databaseId);
  if (!detail) throw new Error("Database not found.");
  const { database, instance } = detail;

  const password = generatePassword();
  await dp.createRole(instance, {
    dbName: database.name,
    ownerRole: database.ownerRole,
    roleName,
    password,
    mode: opts.mode,
    connectionLimit: opts.connectionLimit,
  });

  await db.insert(dbRoles).values({
    databaseId: database.id,
    roleName,
    isOwner: false,
    connectionLimit: opts.connectionLimit,
  });

  await writeAudit({
    actor: opts.actor,
    action: "role.create",
    target: roleName,
    metadata: { database: database.name, mode: opts.mode },
  });

  return {
    roleName,
    password,
    connectionString: connectionString({
      instance,
      dbName: database.name,
      role: roleName,
      password,
    }),
  };
}

export async function deleteRole(
  roleId: string,
  actor: string,
): Promise<void> {
  const [role] = await db
    .select()
    .from(dbRoles)
    .where(eq(dbRoles.id, roleId))
    .limit(1);
  if (!role || role.isOwner) {
    throw new Error("Cannot delete the owner role; delete the database instead.");
  }

  const detail = await getDatabaseDetail(role.databaseId);
  if (detail) {
    await dp.removeRole(detail.instance, {
      dbName: detail.database.name,
      roleName: role.roleName,
    });
  }
  await db.delete(dbRoles).where(eq(dbRoles.id, roleId));

  await writeAudit({ actor, action: "role.delete", target: role.roleName });
}

export async function resetRolePassword(
  roleId: string,
  actor: string,
): Promise<{ roleName: string; password: string; connectionString: string }> {
  const [role] = await db
    .select()
    .from(dbRoles)
    .where(eq(dbRoles.id, roleId))
    .limit(1);
  if (!role) throw new Error("Role not found.");

  const detail = await getDatabaseDetail(role.databaseId);
  if (!detail) throw new Error("Database not found.");
  const { database, instance } = detail;

  const password = generatePassword();
  await dp.setPassword(instance, role.roleName, password);

  await writeAudit({
    actor,
    action: "role.reset_password",
    target: role.roleName,
    metadata: { database: database.name },
  });

  return {
    roleName: role.roleName,
    password,
    connectionString: connectionString({
      instance,
      dbName: database.name,
      role: role.roleName,
      password,
    }),
  };
}
