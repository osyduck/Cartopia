import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseDetail } from "@/lib/services/databases";
import * as dp from "@/lib/dataplane";
import { Badge } from "@/components/badge";
import { DbTabs } from "@/components/db-tabs";
import { RefreshButton } from "@/components/refresh-button";
import { formatBytes, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DatabaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const { database, instance, roles, sizeBytes } = detail;
  const base = `/databases/${id}`;

  const [version, metrics] = await Promise.all([
    dp.serverVersion(instance).catch(() => ""),
    dp.databaseMetrics(instance, database.name).catch(() => null),
  ]);
  const major = version.split(".")[0];
  const quotaPct =
    database.quotaBytes && sizeBytes != null
      ? Math.min(100, (sizeBytes / database.quotaBytes) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/databases"
            className="text-sm text-muted hover:text-text"
          >
            ← Databases
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{database.name}</h1>
            {database.isReadonly ? (
              <Badge tone="warning">read-only</Badge>
            ) : database.status === "active" ? (
              <Badge tone="success">active</Badge>
            ) : (
              <Badge tone="muted">{database.status}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {major ? `PostgreSQL v${major} · ` : ""}Created on{" "}
            {formatDate(database.createdAt)}
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Storage Usage</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatBytes(sizeBytes)}
          </div>
          <div className="text-xs text-muted">
            {database.quotaBytes
              ? `of ${formatBytes(database.quotaBytes)}`
              : "unlimited"}
          </div>
          {quotaPct != null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={
                  quotaPct >= 100
                    ? "h-full bg-danger"
                    : quotaPct >= 80
                      ? "h-full bg-warning"
                      : "h-full bg-success"
                }
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Active connections</div>
          <div className="mt-1 text-2xl font-semibold">
            {metrics?.activeConnections ?? "—"}
          </div>
          <div className="text-xs text-muted">
            {metrics ? `${metrics.totalConnections} total` : "unreachable"}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Roles</div>
          <div className="mt-1 text-2xl font-semibold">{roles.length}</div>
          <div className="text-xs text-muted">instance {instance.name}</div>
        </div>
      </div>

      <DbTabs base={base} />

      {children}
    </div>
  );
}
