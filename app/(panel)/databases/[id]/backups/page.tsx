import { notFound } from "next/navigation";
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
          Auto harian (cron <code>{env.BACKUP_CRON}</code>) · retensi{" "}
          {env.BACKUP_RETENTION_DAYS} hari · pg_dump → S3
        </p>
        <ActionForm
          action={backupDatabaseNowAction}
          label="💾 Backup now"
          pendingText="Membackup…"
          variant="primary"
        >
          <input type="hidden" name="databaseId" value={id} />
        </ActionForm>
      </div>

      <RestoreBackupForm options={restoreOptions} />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ukuran</th>
              <th className="px-4 py-3 font-medium">Lokasi</th>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Belum ada backup. Klik “Backup now” atau tunggu jadwal harian.
                </td>
              </tr>
            )}
            {items.map((b) => (
              <tr key={b.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <Badge tone={statusTone[b.status]}>{b.status}</Badge>
                  {b.error && (
                    <span className="ml-2 text-xs text-danger" title={b.error}>
                      ⚠
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatBytes(b.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <code className="text-xs text-muted">{b.location ?? "—"}</code>
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
