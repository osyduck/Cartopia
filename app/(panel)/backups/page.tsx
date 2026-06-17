import { listBackups, getBackupStats } from "@/lib/services/backups";
import { Badge } from "@/components/badge";
import { ActionForm } from "@/components/action-form";
import { RestoreBackupForm } from "@/components/restore-backup-form";
import { formatBytes, formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import { backupNowAction } from "./actions";

export const dynamic = "force-dynamic";

const statusTone = {
  success: "success",
  failed: "danger",
  running: "warning",
  pending: "muted",
} as const;

export default async function BackupsPage() {
  const [items, stats] = await Promise.all([listBackups(100), getBackupStats()]);

  const restoreOptions = items
    .filter((b) => b.status === "success" && b.location)
    .map((b) => ({
      id: b.id,
      label: `${b.dbName} · ${formatDate(b.createdAt)} (${formatBytes(b.sizeBytes)})`,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Backups</h1>
          <p className="text-sm text-muted">
            Auto harian (cron <code>{env.BACKUP_CRON}</code>) · retensi{" "}
            {env.BACKUP_RETENTION_DAYS} hari · pg_dump → S3
          </p>
        </div>
        <ActionForm
          action={backupNowAction}
          label="💾 Backup now"
          pendingText="Membackup…"
          variant="primary"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Total backup tersimpan</div>
          <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Backup sukses terakhir</div>
          <div className="mt-2 text-sm font-medium">
            {stats.lastSuccessAt ? formatDate(stats.lastSuccessAt) : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-sm text-muted">Retensi</div>
          <div className="mt-2 text-2xl font-semibold">
            {env.BACKUP_RETENTION_DAYS}h
          </div>
        </div>
      </div>

      <RestoreBackupForm options={restoreOptions} />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Database</th>
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Belum ada backup. Klik “Backup now” atau tunggu jadwal harian.
                </td>
              </tr>
            )}
            {items.map((b) => (
              <tr
                key={b.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{b.dbName}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[b.status]}>{b.status}</Badge>
                  {b.error && (
                    <span
                      className="ml-2 text-xs text-danger"
                      title={b.error}
                    >
                      ⚠
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatBytes(b.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <code className="text-xs text-muted">
                    {b.location ?? "—"}
                  </code>
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
