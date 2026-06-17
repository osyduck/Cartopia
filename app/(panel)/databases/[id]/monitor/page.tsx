import { notFound } from "next/navigation";
import { getDatabaseDetail } from "@/lib/services/databases";
import * as dp from "@/lib/dataplane";
import { QueryPerformance } from "@/components/query-performance";
import { formatBytes, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

function Bar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div className={tone} style={{ width: `${Math.min(100, pct)}%` }} />
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

  const [metrics, slowest, total, calls] = await Promise.all([
    dp.databaseMetrics(instance, database.name).catch(() => null),
    dp.queryStats(instance, database.name, "slowest"),
    dp.queryStats(instance, database.name, "total"),
    dp.queryStats(instance, database.name, "calls"),
  ]);
  const queryData =
    slowest && total && calls ? { slowest, total, calls } : null;

  // Active connections vs the database's connection cap (max role limit).
  const connLimit =
    Math.max(0, ...roles.map((r) => r.connectionLimit).filter((n) => n > 0)) ||
    100; // fallback display cap when all roles are unlimited
  const active = metrics?.activeConnections ?? 0;
  const connPct = connLimit ? (active / connLimit) * 100 : 0;

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
      <h2 className="text-lg font-semibold">Database Monitoring</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active connections */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Active Connections</div>
          <div className="mt-1 text-2xl font-semibold">
            {active} <span className="text-base text-muted">/ {connLimit}</span>
          </div>
          <Bar
            pct={connPct}
            tone={connPct >= 90 ? "h-full bg-danger" : "h-full bg-success"}
          />
          <div className="mt-2 text-xs text-muted">connection limit</div>
        </div>

        {/* Database size */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Database Size</div>
          <div className="mt-1 text-2xl font-semibold">
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
                    ? "h-full bg-danger"
                    : sizePct >= 80
                      ? "h-full bg-warning"
                      : "h-full bg-success"
                }
              />
              <div className="mt-2 text-xs text-muted">
                {sizePct.toFixed(0)}% used
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-muted">unlimited</div>
          )}
        </div>

        {/* Cache hit ratio */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Cache Hit Ratio</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatPercent(cache)}
          </div>
          <div
            className={
              "mt-2 text-xs " +
              (cacheLabel === "Optimal"
                ? "text-success"
                : cacheLabel === "Good"
                  ? "text-warning"
                  : "text-muted")
            }
          >
            {cacheLabel === "Optimal" ? "✓ " : ""}
            {cacheLabel}
          </div>
        </div>

        {/* Monitoring status */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Monitoring Status</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            {metrics ? "Live" : "Down"}
            <span
              className={
                "inline-block h-2.5 w-2.5 rounded-full " +
                (metrics ? "bg-success" : "bg-danger")
              }
            />
          </div>
          <div className="mt-2 text-xs text-muted">
            {metrics ? "Updated just now" : "instance unreachable"}
          </div>
        </div>
      </div>

      <QueryPerformance data={queryData} />
    </div>
  );
}
