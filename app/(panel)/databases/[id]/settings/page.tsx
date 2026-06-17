import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getDatabaseDetail } from "@/lib/services/databases";
import { RolesManager } from "@/components/roles-manager";
import { ActionForm } from "@/components/action-form";
import {
  toggleReadOnlyAction,
  deleteDatabaseAction,
} from "@/app/(panel)/databases/actions";

export const dynamic = "force-dynamic";

export default async function DatabaseSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const { database, roles } = detail;
  // Strip the encrypted password before handing roles to the client.
  const safeRoles = roles.map((r) => ({
    id: r.id,
    roleName: r.roleName,
    isOwner: r.isOwner,
    connectionLimit: r.connectionLimit,
  }));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          Roles &amp; users
          <span className="ml-2 align-middle text-sm font-normal text-muted tabular-nums">
            {safeRoles.length}
          </span>
        </h2>
        <RolesManager databaseId={database.id} roles={safeRoles} />
      </section>

      <section className="overflow-hidden rounded-xl border border-danger/25 bg-danger/8">
        <div className="flex items-center gap-2 border-b border-danger/15 px-5 py-3">
          <AlertTriangle className="size-4 shrink-0 text-danger" />
          <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
        </div>

        <div className="divide-y divide-danger/15">
          {/* Read-only toggle (reversible) */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="max-w-sm">
              <h3 className="text-sm font-medium">Read-only mode</h3>
              <p className="mt-0.5 text-xs text-muted">
                {database.isReadonly
                  ? "The database is currently read-only. Writes are rejected."
                  : "Freeze all writes to this database. Existing connections are kept."}
              </p>
            </div>
            <ActionForm
              action={toggleReadOnlyAction}
              label={database.isReadonly ? "Enable writes" : "Set read-only"}
              variant="secondary"
            >
              <input type="hidden" name="id" value={database.id} />
              <input
                type="hidden"
                name="readOnly"
                value={(!database.isReadonly).toString()}
              />
            </ActionForm>
          </div>

          {/* Delete (irreversible) */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="max-w-sm">
              <h3 className="text-sm font-medium">Delete database</h3>
              <p className="mt-0.5 text-xs text-muted">
                Permanently remove &ldquo;{database.name}&rdquo; and all its
                roles. This cannot be undone.
              </p>
            </div>
            <ActionForm
              action={deleteDatabaseAction}
              confirm={`Delete database "${database.name}" and all its roles? This is permanent.`}
              label="Delete database"
              variant="danger"
            >
              <input type="hidden" name="id" value={database.id} />
            </ActionForm>
          </div>
        </div>
      </section>
    </div>
  );
}
