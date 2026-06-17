import Link from "next/link";
import { eq, count } from "drizzle-orm";
import { Plus } from "lucide-react";
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
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <Link
          href="/databases"
          className="glow-primary inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-fg transition-colors duration-150 hover:bg-primary-hover"
        >
          <Plus className="size-4" />
          Database baru
        </Link>
      </div>

      {/* Health + capacity — two composed cards */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Status */}
        <div className="rounded-xl border border-border bg-surface elevation-1 p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
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
            ].map((s, i) => (
              <div
                key={s.k}
                className={i > 0 ? "border-l border-border/60 pl-4" : ""}
              >
                <dd className="text-2xl font-semibold tabular-nums">{s.v}</dd>
                <dt className="mt-0.5 text-xs text-faint">{s.k}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Capacity */}
        <div className="rounded-xl border border-border bg-surface elevation-1 p-6">
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
            {totalUsed > 0
              ? fleet
                  .filter((d) => (d.sizeBytes ?? 0) > 0)
                  .map((d) => (
                    <div
                      key={d.id}
                      className={`${fill[d.h]} min-w-[3px] transition-[width] duration-300`}
                      style={{
                        width: `${((d.sizeBytes ?? 0) / totalUsed) * 100}%`,
                      }}
                      title={`${d.name} — ${formatBytes(d.sizeBytes)}`}
                    />
                  ))
              : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Badge tone="success" dot>
              <span className="tabular-nums">{counts.ok}</span> sehat
            </Badge>
            <Badge tone="warning" dot>
              <span className="tabular-nums">{counts.warning}</span> mendekati
            </Badge>
            <Badge tone="danger" dot>
              <span className="tabular-nums">{counts.over}</span> lewat quota
            </Badge>
            {unlimited > 0 && (
              <span className="text-xs text-muted">
                · <span className="tabular-nums">{unlimited}</span> tanpa batas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* The fleet */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Databases</h2>
          <span className="text-sm text-muted tabular-nums">
            {dbs.length} total
          </span>
        </div>

        {dbs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
            <p className="text-sm text-muted">Belum ada database yang dikelola.</p>
            <Link
              href="/databases"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Buat database pertama →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
            <ul className="divide-y divide-border/60">
              {fleet.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/databases/${d.id}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-surface-2/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${dot[d.h]}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.name}</span>
                          {d.isReadonly && (
                            <Badge tone="danger" dot>
                              read-only
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                            {d.ownerRole}
                          </code>{" "}
                          · {d.instanceName}
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
                            className={`h-full rounded-full ${fill[d.h]} transition-[width] duration-300`}
                            style={{ width: `${Math.max(2, d.pct)}%` }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
