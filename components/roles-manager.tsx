"use client";

import { useActionState } from "react";
import {
  addRoleAction,
  resetPasswordAction,
  deleteRoleAction,
  type ActionState,
} from "@/app/(panel)/databases/actions";
import { SubmitButton } from "@/components/submit-button";
import { SecretReveal } from "@/components/secret-reveal";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/badge";

type Role = {
  id: string;
  roleName: string;
  isOwner: boolean;
  connectionLimit: number;
};

export function RolesManager({
  databaseId,
  roles,
}: {
  databaseId: string;
  roles: Role[];
}) {
  const [addState, addAction] = useActionState<ActionState, FormData>(
    addRoleAction,
    {},
  );
  const [resetState, resetAction] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  );

  const reveal = addState.reveal ?? resetState.reveal;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Tipe</th>
              <th className="px-4 py-2.5 font-medium">Conn limit</th>
              <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2.5">
                  <code>{r.roleName}</code>
                </td>
                <td className="px-4 py-2.5">
                  {r.isOwner ? (
                    <Badge tone="primary">owner</Badge>
                  ) : (
                    <Badge tone="muted">user</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted">
                  {r.connectionLimit === -1 ? "∞" : r.connectionLimit}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-2">
                    <form action={resetAction}>
                      <input type="hidden" name="roleId" value={r.id} />
                      <input
                        type="hidden"
                        name="databaseId"
                        value={databaseId}
                      />
                      <SubmitButton variant="ghost" pendingText="…">
                        Reset password
                      </SubmitButton>
                    </form>
                    {!r.isOwner && (
                      <ActionForm
                        action={deleteRoleAction}
                        confirm={`Hapus role "${r.roleName}"?`}
                        label="Hapus"
                        variant="danger"
                      >
                        <input type="hidden" name="roleId" value={r.id} />
                        <input
                          type="hidden"
                          name="databaseId"
                          value={databaseId}
                        />
                      </ActionForm>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reveal && <SecretReveal data={reveal} />}

      <details className="rounded-xl border border-border bg-surface-2/40 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          + Tambah user/role
        </summary>
        <form action={addAction} className="mt-4 space-y-4">
          <input type="hidden" name="databaseId" value={databaseId} />
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-sm text-muted">Nama role</span>
              <input
                name="roleName"
                required
                placeholder="app_reader"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-muted">Akses</span>
              <select
                name="mode"
                defaultValue="readwrite"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="readwrite">Read &amp; write</option>
                <option value="read">Read only</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-muted">Connection limit</span>
              <input
                name="connectionLimit"
                type="number"
                min={-1}
                defaultValue={-1}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>
          {addState.error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {addState.error}
            </p>
          )}
          <SubmitButton pendingText="Membuat…">Tambah role</SubmitButton>
        </form>
      </details>
    </div>
  );
}
