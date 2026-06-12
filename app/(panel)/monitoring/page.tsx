import {
  getInstancesHealth,
  getDatabasesMonitoring,
  getSizeTrend,
} from "@/lib/services/monitoring";
import { Badge } from "@/components/badge";
import { Sparkline } from "@/components/sparkline";
import { ActionForm } from "@/components/action-form";
import { formatBytes, formatPercent, formatDate } from "@/lib/format";
import { refreshMonitoringAction } from "./actions";

export const dynamic = "force-dynamic";

function cacheTone(ratio: number | null) {
  if (ratio == null) return "muted" as const;
  if (ratio >= 0.99) return "success" as const;
  if (ratio >= 0.9) return "warning" as const;
  return "danger" as const;
}

export default async function MonitoringPage() {
  const [health, dbs] = await Promise.all([
    getInstancesHealth(),
    getDatabasesMonitoring(),
  ]);

  // Size trends per database (last 24h of usage snapshots).
  const trends = new Map<string, number[]>();
  for (const d of dbs) {
    const points = await getSizeTrend(d.id);
    trends.set(
      d.id,
      points.map((p) => p.sizeBytes),
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Monitoring</h1>
          <p className="text-sm text-muted">
            Health instance & metrik database
          </p>
        </div>
        <ActionForm
          action={refreshMonitoringAction}
          label="↻ Refresh"
          pendingText="Mengambil…"
          variant="ghost"
        />
      </div>

      {/* Instance health */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((inst) => (
          <div
            key={inst.id}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{inst.name}</span>
              {inst.status === "online" ? (
                <Badge tone="success">● online</Badge>
              ) : inst.status === "unreachable" ? (
                <Badge tone="danger">● unreachable</Badge>
              ) : (
                <Badge tone="muted">● offline</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              {inst.host}:{inst.port}
            </p>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-muted">Databases</span>
              <span>{inst.databaseCount}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted">Cek terakhir</span>
              <span>{formatDate(inst.lastCheckedAt)}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Per-database metrics */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Database</th>
              <th className="px-4 py-3 font-medium">Active conn</th>
              <th className="px-4 py-3 font-medium">Total conn</th>
              <th className="px-4 py-3 font-medium">Cache hit</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Tren 24h</th>
            </tr>
          </thead>
          <tbody>
            {dbs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Belum ada database.
                </td>
              </tr>
            )}
            {dbs.map((d) => (
              <tr
                key={d.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{d.name}</span>
                  {d.isReadonly && (
                    <span className="ml-2">
                      <Badge tone="warning">read-only</Badge>
                    </span>
                  )}
                  {!d.reachable && (
                    <span className="ml-2">
                      <Badge tone="danger">unreachable</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {d.metrics?.activeConnections ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {d.metrics?.totalConnections ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {d.metrics ? (
                    <Badge tone={cacheTone(d.metrics.cacheHitRatio)}>
                      {formatPercent(d.metrics.cacheHitRatio)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {d.metrics ? formatBytes(d.metrics.sizeBytes) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Sparkline values={trends.get(d.id) ?? []} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
