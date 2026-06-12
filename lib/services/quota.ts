import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  databases,
  instances,
  usageSnapshots,
  quotaEvents,
  type DatabaseRow,
  type Instance,
} from "@/lib/db/schema";
import * as dp from "@/lib/dataplane";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";
import { formatBytes } from "@/lib/format";

export type SweepAction = "none" | "warned" | "enforced" | "recovered";

export type SweepDbResult = {
  name: string;
  sizeBytes: number;
  quotaBytes: number | null;
  action: SweepAction;
};

export type SweepResult = {
  databases: SweepDbResult[];
};

/**
 * Samples on-disk size for every managed database, records a usage snapshot,
 * and drives the soft quota state machine (warn → enforce read-only → recover).
 * Idempotent and safe to run on a schedule or on demand.
 */
export async function runQuotaSweep(): Promise<SweepResult> {
  const rows = await db
    .select({ database: databases, instance: instances })
    .from(databases)
    .innerJoin(instances, eq(databases.instanceId, instances.id));

  // One size round-trip per distinct instance.
  const sizesByInstance = new Map<string, Map<string, number>>();
  const results: SweepDbResult[] = [];

  for (const { database: d, instance } of rows) {
    let sizes = sizesByInstance.get(instance.id);
    if (!sizes) {
      sizes = await dp.allDatabaseSizes(instance).catch(() => new Map());
      sizesByInstance.set(instance.id, sizes);
    }
    const size = sizes.get(d.name) ?? 0;

    await db.insert(usageSnapshots).values({
      databaseId: d.id,
      sizeBytes: size,
    });

    const action =
      d.quotaBytes != null ? await enforce(d, instance, size) : "none";

    results.push({
      name: d.name,
      sizeBytes: size,
      quotaBytes: d.quotaBytes,
      action,
    });
  }

  return { databases: results };
}

export async function getRecentQuotaEvents(limit = 10) {
  return db
    .select({
      id: quotaEvents.id,
      type: quotaEvents.type,
      sizeBytes: quotaEvents.sizeBytes,
      quotaBytes: quotaEvents.quotaBytes,
      createdAt: quotaEvents.createdAt,
      dbName: databases.name,
    })
    .from(quotaEvents)
    .innerJoin(databases, eq(quotaEvents.databaseId, databases.id))
    .orderBy(desc(quotaEvents.createdAt))
    .limit(limit);
}

async function enforce(
  d: DatabaseRow,
  instance: Instance,
  size: number,
): Promise<SweepAction> {
  const quota = d.quotaBytes as number;
  const warnAt = quota * env.QUOTA_WARN_THRESHOLD;
  const recoverAt = quota * env.QUOTA_RECOVER_THRESHOLD;

  // Over quota → enforce read-only (once).
  if (size >= quota) {
    if (d.isReadonly) return "none";
    await dp.setDatabaseReadOnly(instance, d.name, true);
    // Kick existing sessions so the new default takes effect immediately
    // (pooled server connections would otherwise keep writing).
    await dp.terminateDatabaseConnections(instance, d.name).catch(() => {});
    await db
      .update(databases)
      .set({ isReadonly: true, status: "suspended" })
      .where(eq(databases.id, d.id));
    await db.insert(quotaEvents).values({
      databaseId: d.id,
      type: "exceeded",
      sizeBytes: size,
      quotaBytes: quota,
    });
    await notify({
      level: "critical",
      title: `Database "${d.name}" melewati quota`,
      detail: `${formatBytes(size)} / ${formatBytes(quota)} — di-set read-only`,
    });
    return "enforced";
  }

  // Below quota, currently suspended, and dropped under the recover line → unblock.
  if (d.isReadonly && size <= recoverAt) {
    await dp.setDatabaseReadOnly(instance, d.name, false);
    await db
      .update(databases)
      .set({ isReadonly: false, status: "active" })
      .where(eq(databases.id, d.id));
    await db.insert(quotaEvents).values({
      databaseId: d.id,
      type: "recovered",
      sizeBytes: size,
      quotaBytes: quota,
    });
    await notify({
      level: "info",
      title: `Database "${d.name}" kembali normal`,
      detail: `${formatBytes(size)} / ${formatBytes(quota)} — write diaktifkan`,
    });
    return "recovered";
  }

  // Approaching quota → warn once (dedup against the last event).
  if (!d.isReadonly && size >= warnAt) {
    const [last] = await db
      .select({ type: quotaEvents.type })
      .from(quotaEvents)
      .where(eq(quotaEvents.databaseId, d.id))
      .orderBy(desc(quotaEvents.createdAt))
      .limit(1);
    if (last?.type !== "warning" && last?.type !== "exceeded") {
      await db.insert(quotaEvents).values({
        databaseId: d.id,
        type: "warning",
        sizeBytes: size,
        quotaBytes: quota,
      });
      await notify({
        level: "warning",
        title: `Database "${d.name}" mendekati quota`,
        detail: `${formatBytes(size)} / ${formatBytes(quota)}`,
      });
      return "warned";
    }
  }

  return "none";
}
