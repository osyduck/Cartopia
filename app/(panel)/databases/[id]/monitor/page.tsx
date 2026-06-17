import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getDatabaseDetail } from "@/lib/services/databases";
import { getLastMetricAt } from "@/lib/services/monitoring";
import * as dp from "@/lib/dataplane";
import { QueryPerformance } from "@/components/query-performance";
import { formatBytes, formatPercent, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

function Bar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${tone}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export default async function DatabaseMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const { instance, database, roles, sizeBytes } = detail;

  const [metrics, slowest, total, calls, lastMetricAt] = await Promise.all([
    dp.databaseMetrics(instance, database.name).catch(() => null),
    dp.queryStats(instance, database.name, "slowest"),
    dp.queryStats(instance, database.name, "total"),
    dp.queryStats(instance, database.name, "calls"),
    getLastMetricAt(id),
  ]);
  const queryData =
    slowest && total && calls ? { slowest, total, calls } : null;

  // Active connections vs the database's connection cap (max role limit).
  // When every role is unlimited there is no real cap — connLimit stays null.
  const limits = roles.map((r) => r.connectionLimit).filter((n) => n > 0);
  const connLimit = limits.length ? Math.max(...limits) : null;
  const active = metrics?.activeConnections ?? 0;
  const connPct = connLimit != null ? (active / connLimit) * 100 : null;

  const sizePct =
    database.quotaBytes && sizeBytes != null
      ? (sizeBytes / database.quotaBytes) * 100
      : null;

  const cache = metrics?.cacheHitRatio ?? null;
  const cacheLabel =
    cache == null
      ? "—"
      : cache >= 0.95
        ? "Optimal"
        : cache >= 0.9
          ? "Good"
          : "Low";

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Database Monitoring</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active connections */}
        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Active Connections</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {active}
            {connLimit != null && (
              <span className="text-base text-muted"> / {connLimit}</span>
            )}
          </div>
          {connPct != null && (
            <Bar
              pct={connPct}
              tone={connPct >= 90 ? "bg-danger" : "bg-success"}
            />
          )}
          <div className="mt-2 text-xs text-faint">
            {connLimit != null ? "connection limit" : "unlimited"}
          </div>
        </div>

        {/* Database size */}
        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Database Size</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatBytes(sizeBytes)}
            {database.quotaBytes && (
              <span className="text-base text-muted">
                {" "}
                / {formatBytes(database.quotaBytes)}
              </span>
            )}
          </div>
          {sizePct != null ? (
            <>
              <Bar
                pct={sizePct}
                tone={
                  sizePct >= 100
                    ? "bg-danger"
                    : sizePct >= 80
                      ? "bg-warning"
                      : "bg-success"
                }
              />
              <div className="mt-2 text-xs text-faint">
                {sizePct.toFixed(0)}% used
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-faint">unlimited</div>
          )}
        </div>

        {/* Cache hit ratio */}
        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Cache Hit Ratio</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatPercent(cache)}
          </div>
          <div
            className={
              "mt-2 flex items-center gap-1 text-xs " +
              (cacheLabel === "Optimal"
                ? "text-success"
                : cacheLabel === "Good"
                  ? "text-warning"
                  : "text-muted")
            }
          >
            {cacheLabel === "Optimal" && (
              <Check className="size-3.5 text-success" />
            )}
            {cacheLabel}
          </div>
        </div>

        {/* Monitoring status */}
        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Monitoring Status</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            {metrics ? "Connected" : "Unreachable"}
            <span
              className={
                "size-2.5 rounded-full " +
                (metrics ? "bg-success" : "bg-danger")
              }
            />
          </div>
          <div className="mt-2 text-xs text-faint">
            {!metrics
              ? "instance unreachable"
              : lastMetricAt
                ? `Last sample ${formatRelative(lastMetricAt)}`
                : "On-demand"}
          </div>
        </div>
      </div>

      <QueryPerformance data={queryData} />
    </div>
  );
}
