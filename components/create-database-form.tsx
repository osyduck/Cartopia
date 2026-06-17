"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  createDatabaseAction,
  type ActionState,
} from "@/app/(panel)/databases/actions";
import { SubmitButton } from "@/components/submit-button";
import { SecretReveal } from "@/components/secret-reveal";

export function CreateDatabaseForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createDatabaseAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.reveal) formRef.current?.reset();
  }, [state.reveal]);

  return (
    <div className="rounded-xl border border-border bg-surface elevation-1 p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          <Plus className="size-4 text-faint" />
          Database baru
        </span>
        {open ? (
          <ChevronUp className="size-4 text-faint" />
        ) : (
          <ChevronDown className="size-4 text-faint" />
        )}
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5 sm:col-span-3">
              <span className="text-sm text-muted">Nama database</span>
              <input
                name="name"
                required
                placeholder="my_app"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
              />
              <span className="text-xs text-faint">
                Role owner <code>{"<nama>_owner"}</code> dibuat otomatis.
              </span>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm text-muted">Quota (MB)</span>
              <input
                name="quotaMb"
                type="number"
                min={0}
                defaultValue={0}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
              />
              <span className="text-xs text-faint">0 = unlimited</span>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm text-muted">Connection limit</span>
              <input
                name="connectionLimit"
                type="number"
                min={-1}
                defaultValue={-1}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
              />
              <span className="text-xs text-faint">-1 = unlimited</span>
            </label>
          </div>

          {state.error && (
            <p className="rounded-lg border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <SubmitButton pendingText="Membuat…">Buat database</SubmitButton>
        </form>
      )}

      {state.reveal && (
        <div className="mt-4">
          <SecretReveal data={state.reveal} />
        </div>
      )}
    </div>
  );
}
