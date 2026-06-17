import Link from "next/link";
import { desc, count } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** Compact page-number window: 1 … c-1 c c+1 … last (≤7 slots). */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const parsed = Number(sp.page);
  const requested = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;

  const [{ n: total }] = await db.select({ n: count() }).from(auditLogs);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, totalPages);

  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted">
          {total} total entries
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No activity yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/40"
              >
                <td className="px-4 py-3 text-muted tabular-nums">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-4 py-3 text-text">{log.actor}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
                    {log.action}
                  </code>
                </td>
                <td
                  className={`px-4 py-3 ${log.target ? "font-medium" : "text-muted"}`}
                >
                  {log.target ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted tabular-nums">
              Showing {rangeStart}–{rangeEnd} of {total} entries
            </p>
            <nav
              className="flex items-center gap-1"
              aria-label="Audit log pagination"
            >
              {/* Prev */}
              {page > 1 ? (
                <Link
                  href={`/audit?page=${page - 1}`}
                  rel="prev"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              ) : (
                <span className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md text-faint" aria-hidden>
                  <ChevronLeft className="size-4" />
                </span>
              )}

              {/* Page numbers */}
              {pageWindow(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span
                    key={`e${i}`}
                    className="inline-flex size-8 items-center justify-center text-xs text-faint"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={`/audit?page=${p}`}
                    aria-current={p === page ? "page" : undefined}
                    className={
                      p === page
                        ? "inline-flex size-8 items-center justify-center rounded-md border border-primary/22 bg-primary/14 text-xs font-medium tabular-nums text-primary"
                        : "inline-flex size-8 items-center justify-center rounded-md border border-transparent text-xs font-medium tabular-nums text-muted transition-colors hover:bg-surface-2 hover:text-text"
                    }
                  >
                    {p}
                  </Link>
                ),
              )}

              {/* Next */}
              {page < totalPages ? (
                <Link
                  href={`/audit?page=${page + 1}`}
                  rel="next"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-transparent text-muted transition-colors hover:bg-surface-2 hover:text-text"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md text-faint" aria-hidden>
                  <ChevronRight className="size-4" />
                </span>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
