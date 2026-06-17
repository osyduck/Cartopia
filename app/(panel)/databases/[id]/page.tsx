import { notFound } from "next/navigation";
import {
  getDatabaseDetail,
  buildConnectionMethods,
} from "@/lib/services/databases";
import * as dp from "@/lib/dataplane";
import { ConnectionMethods } from "@/components/connection-methods";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DatabaseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const { database, instance, roles, sizeBytes } = detail;
  const metrics = await dp.databaseMetrics(instance, database.name).catch(
    () => null,
  );

  const methods = buildConnectionMethods({
    instance: detail.instance,
    dbName: detail.database.name,
    username: detail.database.ownerRole,
    password: detail.ownerPassword,
  });

  const quotaPct =
    database.quotaBytes && sizeBytes != null
      ? Math.min(100, (sizeBytes / database.quotaBytes) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Storage Usage</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatBytes(sizeBytes)}
          </div>
          <div className="text-xs text-faint">
            {database.quotaBytes
              ? `of ${formatBytes(database.quotaBytes)}`
              : "unlimited"}
          </div>
          {quotaPct != null && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  quotaPct >= 100
                    ? "bg-danger"
                    : quotaPct >= 80
                      ? "bg-warning"
                      : "bg-success",
                )}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Active connections</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {metrics?.activeConnections ?? "—"}
          </div>
          <div className="text-xs text-faint">
            {metrics ? `${metrics.totalConnections} total` : "unreachable"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="text-sm text-muted">Roles</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {roles.length}
          </div>
          <div className="text-xs text-faint">instance {instance.name}</div>
        </div>
      </div>

      <ConnectionMethods
        methods={methods}
        hasPassword={detail.ownerPassword != null}
      />
    </div>
  );
}
