"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
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

const field =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface";

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
  const [showAdd, setShowAdd] = useState(false);

  const reveal = addState.reveal ?? resetState.reveal;

  // Close the add-role panel once a role is successfully created.
  useEffect(() => {
    if (addState.reveal) setShowAdd(false);
  }, [addState.reveal]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-surface elevation-1">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Conn limit</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/40"
              >
                <td className="px-4 py-3">
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                    {r.roleName}
                  </code>
                </td>
                <td className="px-4 py-3">
                  {r.isOwner ? (
                    <Badge tone="primary" dot>
                      owner
                    </Badge>
                  ) : (
                    <Badge tone="muted" dot>
                      user
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted tabular-nums">
                  {r.connectionLimit === -1 ? "∞" : r.connectionLimit}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <form action={resetAction}>
                      <input type="hidden" name="roleId" value={r.id} />
                      <input
                        type="hidden"
                        name="databaseId"
                        value={databaseId}
                      />
                      <SubmitButton variant="ghost" size="sm" pendingText="…">
                        Reset password
                      </SubmitButton>
                    </form>
                    {!r.isOwner && (
                      <ActionForm
                        action={deleteRoleAction}
                        confirm={`Delete role "${r.roleName}"?`}
                        label="Delete"
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

      {showAdd ? (
        <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">New role</h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              aria-label="Close"
              className="rounded-md p-1 text-faint transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X className="size-4" />
            </button>
          </div>
          <form action={addAction} className="mt-4 space-y-4">
            <input type="hidden" name="databaseId" value={databaseId} />
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-sm text-muted">Role name</span>
                <input
                  name="roleName"
                  required
                  placeholder="app_reader"
                  className={field}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm text-muted">Access</span>
                <select
                  name="mode"
                  defaultValue="readwrite"
                  className={field}
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
                  className={field}
                />
              </label>
            </div>
            {addState.error && (
              <p className="rounded-lg border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger">
                {addState.error}
              </p>
            )}
            <div className="flex justify-end">
              <SubmitButton pendingText="Creating…">Add role</SubmitButton>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/20 px-4 py-3 text-sm text-muted transition-colors hover:bg-surface-2/50 hover:text-text"
        >
          <Plus className="size-4" />
          Add user/role
        </button>
      )}
    </div>
  );
}
