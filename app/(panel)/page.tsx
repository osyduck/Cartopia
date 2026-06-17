import Link from "next/link";
import { desc, eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { databases, dbRoles, instances, auditLogs } from "@/lib/db/schema";
import { listDatabases } from "@/lib/services/databases";
import { getRecentQuotaEvents } from "@/lib/services/quota";
import { Badge } from "@/components/badge";
import { formatBytes, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [[dbCount], [roleCount], [instanceCount], recent, dbs, quotaEvents] =
    await Promise.all([
      db.select({ n: count() }).from(databases),
      db.select({ n: count() }).from(dbRoles),
      db
        .select({ n: count() })
        .from(instances)
        .where(eq(instances.status, "online")),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8),
      listDatabases(),
      getRecentQuotaEvents(8),
    ]);

  const eventTone = {
    warning: "warning",
    exceeded: "danger",
    recovered: "success",
  } as const;

  const totalBytes = dbs.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0);

  const stats = [
    { label: "Databases", value: dbCount.n, href: "/databases" },
    { label: "Roles", value: roleCount.n, href: "/databases" },
    { label: "Instances online", value: instanceCount.n },
    { label: "Storage terpakai", value: formatBytes(totalBytes) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="text-sm text-muted">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
            {s.href && (
              <Link
                href={s.href}
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                Lihat →
              </Link>
            )}
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-medium">Quota events</h2>
        {quotaEvents.length === 0 ? (
          <p className="text-sm text-muted">Belum ada event quota.</p>
        ) : (
          <ul className="space-y-2">
            {quotaEvents.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Badge tone={eventTone[e.type]}>{e.type}</Badge>
                  <span className="font-medium">{e.dbName}</span>
                  <span className="text-muted">
                    {formatBytes(e.sizeBytes)} / {formatBytes(e.quotaBytes)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatDate(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-medium">Aktivitas terbaru</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Belum ada aktivitas.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  <code className="text-muted">{log.action}</code>{" "}
                  {log.target && <span className="font-medium">{log.target}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatDate(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
