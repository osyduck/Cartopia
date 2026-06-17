import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getDatabaseDetail } from "@/lib/services/databases";
import { listBackupsForDatabase } from "@/lib/services/backups";
import { Badge } from "@/components/badge";
import { ActionForm } from "@/components/action-form";
import { RestoreBackupForm } from "@/components/restore-backup-form";
import { backupDatabaseNowAction } from "@/app/(panel)/backups/actions";
import { formatBytes, formatDate } from "@/lib/format";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const statusTone = {
  success: "success",
  failed: "danger",
  running: "warning",
  pending: "muted",
} as const;

/** Best-effort humanization of common cron patterns (daily/weekly at a time). */
function humanizeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [, hour, dom, mon, dow] = parts;
  const fmtHour = (h: string) => {
    const n = parseInt(h, 10);
    if (Number.isNaN(n)) return h;
    if (n === 0) return "12:00 AM";
    if (n < 12) return `${n}:00 AM`;
    if (n === 12) return "12:00 PM";
    return `${n - 12}:00 PM`;
  };
  const at = fmtHour(hour);
  if (dom === "*" && mon === "*" && dow === "*") return `Daily at ${at}`;
  if (dom === "*" && mon === "*" && dow !== "*") return `Weekly at ${at}`;
  return cron;
}

export default async function DatabaseBackupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const items = await listBackupsForDatabase(id);
  const restoreOptions = items
    .filter((b) => b.status === "success" && b.location)
    .map((b) => ({
      id: b.id,
      label: `${formatDate(b.createdAt)} (${formatBytes(b.sizeBytes)})`,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Backups</h2>
          <p className="mt-1 text-sm text-muted">
            {humanizeCron(env.BACKUP_CRON)} · {env.BACKUP_RETENTION_DAYS}-day
            retention · pg_dump → S3
          </p>
        </div>
        <ActionForm
          action={backupDatabaseNowAction}
          label="Backup now"
          pendingText="Backing up…"
          variant="primary"
        >
          <input type="hidden" name="databaseId" value={id} />
        </ActionForm>
      </div>

      <RestoreBackupForm options={restoreOptions} />

      <div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No backups yet.
                </td>
              </tr>
            )}
            {items.map((b) => (
              <tr
                key={b.id}
                className="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/40"
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <Badge tone={statusTone[b.status]} dot>
                      {b.status}
                    </Badge>
                    {b.error && (
                      <span title={b.error}>
                        <AlertTriangle className="size-3.5 text-danger" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatBytes(b.sizeBytes)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(b.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {b.status === "success" && b.location && (
                    <a
                      href={`/backups/${b.id}/download`}
                      className="text-primary hover:underline"
                    >
                      Download
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
