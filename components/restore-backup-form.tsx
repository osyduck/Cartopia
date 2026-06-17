"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { restoreBackupAction } from "@/app/(panel)/backups/actions";
import type { ActionState } from "@/app/(panel)/databases/actions";
import { SubmitButton } from "@/components/submit-button";
import { SecretReveal } from "@/components/secret-reveal";

const field =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

export function RestoreBackupForm({
  options,
}: {
  options: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    restoreBackupAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.reveal) formRef.current?.reset();
  }, [state.reveal]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium">↺ Restore dari backup</span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open &&
        (options.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Belum ada backup sukses untuk di-restore.
          </p>
        ) : (
          <form ref={formRef} action={formAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm text-muted">Backup sumber</span>
                <select name="backupId" required className={field}>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm text-muted">Nama database baru</span>
                <input
                  name="newName"
                  required
                  placeholder="restored_app"
                  className={field}
                />
                <span className="text-xs text-muted">
                  DB managed baru + owner role dibuat otomatis.
                </span>
              </label>
            </div>

            {state.error && (
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            )}

            <SubmitButton pendingText="Me-restore…">
              Restore ke DB baru
            </SubmitButton>
          </form>
        ))}

      {state.reveal && (
        <div className="mt-4">
          <SecretReveal data={state.reveal} />
        </div>
      )}
    </div>
  );
}
