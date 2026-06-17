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
        <h2 className="text-base font-semibold">Roles &amp; users</h2>
        <RolesManager databaseId={database.id} roles={safeRoles} />
      </section>

      <section className="rounded-xl border border-danger/25 bg-danger/8 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-danger">
          <AlertTriangle className="size-4 text-danger" />
          Danger zone
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionForm
            action={toggleReadOnlyAction}
            label={database.isReadonly ? "Enable writes" : "Set read-only"}
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
            confirm={`Delete database "${database.name}" and all its roles? This is permanent.`}
            label="Delete database"
            variant="danger"
          >
            <input type="hidden" name="id" value={database.id} />
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
