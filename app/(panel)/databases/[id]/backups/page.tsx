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
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Daily auto (cron{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
            {env.BACKUP_CRON}
          </code>
          ) · {env.BACKUP_RETENTION_DAYS}-day retention · pg_dump → S3
        </p>
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
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
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
                <td className="px-4 py-3">
                  <code className="text-xs text-muted">
                    {b.location ?? "—"}
                  </code>
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(b.createdAt)}</td>
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
