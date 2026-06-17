"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDuration, formatCount } from "@/lib/format";
import type { QueryStat, QuerySort } from "@/lib/dataplane";

const TABS: { key: QuerySort; label: string }[] = [
  { key: "slowest", label: "Slowest" },
  { key: "total", label: "Most Time" },
  { key: "calls", label: "Most Called" },
];

function avgTone(ms: number): string {
  if (ms >= 100) return "text-danger";
  if (ms >= 10) return "text-warning";
  return "text-success";
}

export function QueryPerformance({
  data,
}: {
  data: { slowest: QueryStat[]; total: QueryStat[]; calls: QueryStat[] } | null;
}) {
  const [tab, setTab] = useState<QuerySort>("slowest");

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 p-5">
        <h2 className="font-medium">Query Performance</h2>
        <div className="flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 transition",
                tab === t.key
                  ? "bg-surface text-text shadow-sm"
                  : "text-muted hover:text-text",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="px-5 pb-6 text-sm text-muted">
          <code>pg_stat_statements</code> belum aktif di instance ini.
        </p>
      ) : data[tab].length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted">
          Belum ada statistik query. Jalankan beberapa query lalu refresh.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Query</th>
              <th className="px-4 py-3 font-medium">Calls</th>
              <th className="px-4 py-3 font-medium">Total Time</th>
              <th className="px-4 py-3 font-medium">Avg Time</th>
              <th className="px-4 py-3 font-medium">Rows</th>
            </tr>
          </thead>
          <tbody>
            {data[tab].map((q, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="max-w-md px-5 py-3">
                  <code className="line-clamp-2 break-all text-xs text-muted">
                    {q.query}
                  </code>
                </td>
                <td className="px-4 py-3">{formatCount(q.calls)}</td>
                <td className="px-4 py-3">{formatDuration(q.totalTimeMs)}</td>
                <td className={cn("px-4 py-3 font-medium", avgTone(q.meanTimeMs))}>
                  {formatDuration(q.meanTimeMs)}
                </td>
                <td className="px-4 py-3 text-muted">{formatCount(q.rows)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
