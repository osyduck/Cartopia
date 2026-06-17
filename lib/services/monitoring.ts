import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { databases, instances, metricSnapshots } from "@/lib/db/schema";
import * as dp from "@/lib/dataplane";

// ─── Collection (run by the worker) ──────────────────────────────────────────

export type MonitorSweepResult = {
  instancesChecked: number;
  databasesSampled: number;
};

/** Ping every instance + sample per-database metrics into metric_snapshots. */
export async function runMonitorSweep(): Promise<MonitorSweepResult> {
  const allInstances = await db.select().from(instances);
  const reachable = new Map<string, boolean>();

  for (const inst of allInstances) {
    const ok = await dp.pingInstance(inst);
    reachable.set(inst.id, ok);
    await db
      .update(instances)
      .set({
        status: ok ? "online" : "unreachable",
        lastCheckedAt: new Date(),
      })
      .where(eq(instances.id, inst.id));
  }

  const rows = await db
    .select({ database: databases, instance: instances })
    .from(databases)
    .innerJoin(instances, eq(databases.instanceId, instances.id));

  let sampled = 0;
  for (const { database: d, instance } of rows) {
    if (!reachable.get(instance.id)) continue;
    try {
      const m = await dp.databaseMetrics(instance, d.name);
      await db.insert(metricSnapshots).values({
        databaseId: d.id,
        activeConnections: m.activeConnections,
        cacheHitRatio: m.cacheHitRatio,
      });
      sampled++;
    } catch {
      // skip a database that disappeared mid-sweep
    }
  }

  return { instancesChecked: allInstances.length, databasesSampled: sampled };
}

/** When the worker last sampled metrics for a database (null if never). */
export async function getLastMetricAt(
  databaseId: string,
): Promise<Date | null> {
  const [row] = await db
    .select({ capturedAt: metricSnapshots.capturedAt })
    .from(metricSnapshots)
    .where(eq(metricSnapshots.databaseId, databaseId))
    .orderBy(desc(metricSnapshots.capturedAt))
    .limit(1);
  return row?.capturedAt ?? null;
}
