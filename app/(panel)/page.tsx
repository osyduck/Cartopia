import Link from "next/link";
import { eq, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { databases, dbRoles, instances } from "@/lib/db/schema";
import { listDatabases, type DatabaseListItem } from "@/lib/services/databases";
import { Badge } from "@/components/badge";
import { formatBytes } from "@/lib/format";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const WARN_PCT = env.QUOTA_WARN_THRESHOLD * 100;

type Health = "ok" | "warning" | "over";

const dot: Record<Health, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  over: "bg-danger",
};
const fill: Record<Health, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  over: "bg-danger",
};

function usagePct(d: DatabaseListItem): number {
  if (!d.quotaBytes || d.sizeBytes == null) return 0;
  return Math.min(100, (d.sizeBytes / d.quotaBytes) * 100);
}

function health(d: DatabaseListItem): Health {
  if (d.isReadonly) return "over";
  if (d.quotaBytes && usagePct(d) >= WARN_PCT) return "warning";
  return "ok";
}

export default async function OverviewPage() {
  const [[dbCount], [roleCount], [instOnline], [instTotal], dbs] =
    await Promise.all([
      db.select({ n: count() }).from(databases),
      db.select({ n: count() }).from(dbRoles),
      db
        .select({ n: count() })
        .from(instances)
        .where(eq(instances.status, "online")),
      db.select({ n: count() }).from(instances),
      listDatabases(),
    ]);

  const totalUsed = dbs.reduce((s, d) => s + (d.sizeBytes ?? 0), 0);
  const totalQuota = dbs.reduce((s, d) => s + (d.quotaBytes ?? 0), 0);
  const unlimited = dbs.filter((d) => !d.quotaBytes).length;
  const usedPct = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : null;

  const counts: Record<Health, number> = { ok: 0, warning: 0, over: 0 };
  const fleet = dbs.map((d) => {
    const h = health(d);
    counts[h]++;
    return { ...d, h, pct: usagePct(d) };
  });
  const rank: Record<Health, number> = { over: 0, warning: 1, ok: 2 };
  fleet.sort((a, b) => rank[a.h] - rank[b.h] || b.pct - a.pct);

  const overall: Health =
    counts.over > 0 ? "over" : counts.warning > 0 ? "warning" : "ok";
  const headline =
    counts.over > 0
      ? `${counts.over} database lewat quota — read-only`
      : counts.warning > 0
        ? `${counts.warning} database mendekati quota`
        : dbs.length === 0
          ? "Belum ada database"
          : "Semua database sehat";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <Link
          href="/databases"
          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90"
        >
          + Database baru
        </Link>
      </div>

      {/* Health + capacity — one panel, two halves */}
      <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
        {/* Status */}
        <div className="bg-surface p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${dot[overall]} opacity-40 motion-reduce:animate-none ${overall !== "ok" ? "animate-ping" : ""}`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${dot[overall]}`}
              />
            </span>
            <span className="text-lg font-semibold text-balance">
              {headline}
            </span>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4">
            {[
              { k: "Databases", v: dbCount.n },
              { k: "Roles", v: roleCount.n },
              { k: "Instances", v: `${instOnline.n}/${instTotal.n}` },
            ].map((s) => (
              <div key={s.k}>
                <dd className="text-2xl font-semibold tabular-nums">{s.v}</dd>
                <dt className="mt-0.5 text-xs text-muted">{s.k}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Capacity */}
        <div className="bg-surface p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">Storage terpakai</span>
            <span className="text-sm text-muted tabular-nums">
              {usedPct != null ? `${usedPct.toFixed(0)}% dari quota` : "—"}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatBytes(totalUsed)}
            </span>
            {totalQuota > 0 && (
              <span className="text-sm text-muted tabular-nums">
                / {formatBytes(totalQuota)} dialokasikan
              </span>
            )}
          </div>

          {/* Stacked distribution: each db's share of used storage, by health */}
          <div className="mt-4 flex h-2.5 gap-px overflow-hidden rounded-full bg-surface-2">
            {totalUsed > 0 ? (
              fleet
                .filter((d) => (d.sizeBytes ?? 0) > 0)
                .map((d) => (
                  <div
                    key={d.id}
                    className={`${fill[d.h]} min-w-[3px] transition-[width]`}
                    style={{ width: `${((d.sizeBytes ?? 0) / totalUsed) * 100}%` }}
                    title={`${d.name} — ${formatBytes(d.sizeBytes)}`}
                  />
                ))
            ) : (
              <div className="w-full" />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <Legend tone="ok" label="sehat" n={counts.ok} />
            <Legend tone="warning" label="mendekati" n={counts.warning} />
            <Legend tone="over" label="lewat quota" n={counts.over} />
            {unlimited > 0 && <span>· {unlimited} tanpa batas</span>}
          </div>
        </div>
      </section>

      {/* The fleet */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Databases</h2>
          <span className="text-sm text-muted tabular-nums">
            {dbs.length} total
          </span>
        </div>

        {dbs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
            <p className="text-sm text-muted">
              Belum ada database yang dikelola.
            </p>
            <Link
              href="/databases"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Buat database pertama →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {fleet.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/databases/${d.id}`}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-surface-2/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${dot[d.h]}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.name}</span>
                        {d.isReadonly && <Badge tone="danger">read-only</Badge>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        <code>{d.ownerRole}</code> · {d.instanceName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:w-64 sm:justify-end">
                    <div className="text-right text-xs tabular-nums text-muted">
                      <span className="text-text">
                        {formatBytes(d.sizeBytes)}
                      </span>{" "}
                      / {d.quotaBytes ? formatBytes(d.quotaBytes) : "∞"}
                    </div>
                    <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2">
                      {d.quotaBytes ? (
                        <div
                          className={`h-full ${fill[d.h]}`}
                          style={{ width: `${Math.max(2, d.pct)}%` }}
                        />
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Legend({
  tone,
  label,
  n,
}: {
  tone: Health;
  label: string;
  n: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
      <span className="tabular-nums text-text">{n}</span> {label}
    </span>
  );
}
