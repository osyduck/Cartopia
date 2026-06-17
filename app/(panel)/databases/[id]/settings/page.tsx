import { notFound } from "next/navigation";
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
        <h2 className="font-medium">Roles &amp; users</h2>
        <RolesManager databaseId={database.id} roles={safeRoles} />
      </section>

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
