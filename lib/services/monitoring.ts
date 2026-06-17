import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  databases,
  instances,
  metricSnapshots,
  usageSnapshots,
  type Instance,
} from "@/lib/db/schema";
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

// ─── Read models (for the Monitoring page) ───────────────────────────────────

export type InstanceHealth = Instance & { databaseCount: number };

export async function getInstancesHealth(): Promise<InstanceHealth[]> {
  const rows = await db
    .select({
      instance: instances,
      databaseCount: sql<number>`count(${databases.id})::int`,
    })
    .from(instances)
    .leftJoin(databases, eq(databases.instanceId, instances.id))
    .groupBy(instances.id)
    .orderBy(instances.name);
  return rows.map((r) => ({ ...r.instance, databaseCount: r.databaseCount }));
}

export type DatabaseMonitor = {
  id: string;
  name: string;
  instanceName: string;
  isReadonly: boolean;
  reachable: boolean;
  metrics: dp.DbMetrics | null;
};

export async function getDatabasesMonitoring(): Promise<DatabaseMonitor[]> {
  const rows = await db
    .select({ database: databases, instance: instances })
    .from(databases)
    .innerJoin(instances, eq(databases.instanceId, instances.id))
    .orderBy(databases.name);

  const out: DatabaseMonitor[] = [];
  for (const { database: d, instance } of rows) {
    const metrics = await dp
      .databaseMetrics(instance, d.name)
      .catch(() => null);
    out.push({
      id: d.id,
      name: d.name,
      instanceName: instance.name,
      isReadonly: d.isReadonly,
      reachable: metrics != null,
      metrics,
    });
  }
  return out;
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

export type TrendPoint = { capturedAt: Date; sizeBytes: number };

/** Recent size samples for a database, oldest→newest (last 24h). */
export async function getSizeTrend(
  databaseId: string,
  sinceHours = 24,
): Promise<TrendPoint[]> {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  return db
    .select({
      capturedAt: usageSnapshots.capturedAt,
      sizeBytes: usageSnapshots.sizeBytes,
    })
    .from(usageSnapshots)
    .where(
      and(
        eq(usageSnapshots.databaseId, databaseId),
        gte(usageSnapshots.capturedAt, since),
      ),
    )
    .orderBy(asc(usageSnapshots.capturedAt))
    .limit(200);
}
