import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { listDatabases } from "@/lib/services/databases";
import { CreateDatabaseForm } from "@/components/create-database-form";
import { Badge } from "@/components/badge";
import { ActionForm } from "@/components/action-form";
import { formatBytes } from "@/lib/format";
import { env } from "@/lib/env";
import { runSweepAction } from "./actions";

export const dynamic = "force-dynamic";

const WARN_PCT = env.QUOTA_WARN_THRESHOLD * 100;

function quotaPct(size: number | null, quota: number | null): number | null {
  if (!quota || size == null) return null;
  return (size / quota) * 100;
}

export default async function DatabasesPage() {
  const dbs = await listDatabases();

  const alerts = dbs.filter((d) => {
    const pct = quotaPct(d.sizeBytes, d.quotaBytes);
    return d.isReadonly || (pct != null && pct >= WARN_PCT);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Databases</h1>
          <p className="mt-1 text-sm text-muted">
            {dbs.length} database dikelola
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionForm
            action={runSweepAction}
            label="Quota sweep"
            pendingText="Memindai…"
            variant="ghost"
          />
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-warning/25 bg-warning/8 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{alerts.length} database butuh perhatian</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {alerts.map((d) => {
              const pct = quotaPct(d.sizeBytes, d.quotaBytes);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/databases/${d.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {d.name}
                  </Link>
                  <span className="text-muted">
                    {formatBytes(d.sizeBytes)} / {formatBytes(d.quotaBytes)}
                    {pct != null && ` (${pct.toFixed(0)}%)`}
                  </span>
                  {d.isReadonly ? (
                    <Badge tone="danger" dot>
                      over quota · read-only
                    </Badge>
                  ) : (
                    <Badge tone="warning" dot>
                      mendekati quota
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <CreateDatabaseForm />

      <div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Instance</th>
              <th className="px-4 py-3 font-medium">Ukuran</th>
              <th className="px-4 py-3 font-medium">Quota</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {dbs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Belum ada database. Buat yang pertama di atas.
                </td>
              </tr>
            )}
            {dbs.map((d) => {
              const pct = quotaPct(d.sizeBytes, d.quotaBytes);
              return (
                <tr
                  key={d.id}
                  className="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/databases/${d.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{d.instanceName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatBytes(d.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums">
                    {d.quotaBytes ? formatBytes(d.quotaBytes) : "∞"}
                  </td>
                  <td className="px-4 py-3">
                    {pct == null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className={
                              pct >= 100
                                ? "h-full rounded-full bg-danger"
                                : pct >= WARN_PCT
                                  ? "h-full rounded-full bg-warning"
                                  : "h-full rounded-full bg-success"
                            }
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted tabular-nums">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.isReadonly ? (
                      <Badge tone="danger" dot>
                        read-only
                      </Badge>
                    ) : pct != null && pct >= WARN_PCT ? (
                      <Badge tone="warning" dot>
                        warning
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        active
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
