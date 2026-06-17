import { notFound } from "next/navigation";
import { getDatabaseDetail } from "@/lib/services/databases";
import { getSizeTrend } from "@/lib/services/monitoring";
import * as dp from "@/lib/dataplane";
import { Sparkline } from "@/components/sparkline";
import { formatBytes, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
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

  const [metrics, trend] = await Promise.all([
    dp.databaseMetrics(detail.instance, detail.database.name).catch(() => null),
    getSizeTrend(id),
  ]);
  const values = trend.map((p) => p.sizeBytes);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active connections"
          value={metrics ? String(metrics.activeConnections) : "—"}
        />
        <MetricCard
          label="Total connections"
          value={metrics ? String(metrics.totalConnections) : "—"}
        />
        <MetricCard
          label="Cache hit ratio"
          value={
            metrics?.cacheHitRatio != null
              ? formatPercent(metrics.cacheHitRatio)
              : "—"
          }
        />
        <MetricCard
          label="Size"
          value={metrics ? formatBytes(metrics.sizeBytes) : "—"}
        />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-medium">Tren ukuran (24 jam)</h2>
        <div className="mt-4">
          <Sparkline values={values} width={600} height={80} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {values.length} sampel ukuran dari worker monitoring.
        </p>
      </section>
    </div>
  );
}
