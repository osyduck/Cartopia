import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDatabaseDetail,
  connectionString,
} from "@/lib/services/databases";
import { Badge } from "@/components/badge";
import { CopyButton } from "@/components/copy-button";
import { RolesManager } from "@/components/roles-manager";
import { ActionForm } from "@/components/action-form";
import { formatBytes } from "@/lib/format";
import {
  deleteDatabaseAction,
  toggleReadOnlyAction,
} from "@/app/(panel)/databases/actions";

export const dynamic = "force-dynamic";

export default async function DatabaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const { database, instance, roles, sizeBytes } = detail;
  const quotaPct =
    database.quotaBytes && sizeBytes != null
      ? Math.min(100, (sizeBytes / database.quotaBytes) * 100)
      : null;

  const ownerConn = connectionString({
    instance,
    dbName: database.name,
    role: database.ownerRole,
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/databases" className="text-sm text-muted hover:text-text">
          ← Databases
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{database.name}</h1>
          {database.isReadonly ? (
            <Badge tone="warning">read-only</Badge>
          ) : (
            <Badge tone="success">active</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          Instance <code>{instance.name}</code> · owner{" "}
          <code>{database.ownerRole}</code>
        </p>
      </div>

      {/* Storage */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Storage</h2>
          <span className="text-sm text-muted">
            {formatBytes(sizeBytes)}
            {database.quotaBytes
              ? ` / ${formatBytes(database.quotaBytes)}`
              : " (unlimited)"}
          </span>
        </div>
        {quotaPct != null && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={
                quotaPct >= 100
                  ? "h-full bg-danger"
                  : quotaPct >= 80
                    ? "h-full bg-warning"
                    : "h-full bg-success"
              }
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        )}
      </section>

      {/* Connection */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-medium">Connection string (owner)</h2>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <code className="break-all text-xs text-muted">{ownerConn}</code>
          <CopyButton value={ownerConn} className="shrink-0" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Lewat PgBouncer. Password tidak disimpan — gunakan “Reset password”
          untuk mendapatkan yang baru.
        </p>
      </section>

      {/* Roles */}
      <section className="space-y-3">
        <h2 className="font-medium">Roles &amp; users</h2>
        <RolesManager databaseId={database.id} roles={roles} />
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
        <h2 className="font-medium text-danger">Danger zone</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionForm
            action={toggleReadOnlyAction}
            label={database.isReadonly ? "Aktifkan write" : "Set read-only"}
            variant="ghost"
          >
            <input type="hidden" name="id" value={database.id} />
            <input
              type="hidden"
              name="readOnly"
              value={(!database.isReadonly).toString()}
            />
          </ActionForm>

          <ActionForm
            action={deleteDatabaseAction}
            confirm={`Hapus database "${database.name}" beserta semua rolenya? Tindakan ini permanen.`}
            label="Hapus database"
            variant="danger"
          >
            <input type="hidden" name="id" value={database.id} />
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
