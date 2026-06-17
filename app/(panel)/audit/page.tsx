import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted">{logs.length} entri terakhir</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Aktor</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  Belum ada aktivitas.
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
      </div>
    </div>
  );
}
