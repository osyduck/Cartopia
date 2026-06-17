"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { CopyButton } from "@/components/copy-button";
import type { ConnMethod } from "@/lib/services/databases";

function Field({
  label,
  value,
  secret = false,
  className,
}: {
  label: string;
  value: string;
  secret?: boolean;
  className?: string;
}) {
  const [show, setShow] = useState(!secret);
  const display = secret && !show ? "•".repeat(Math.min(28, value.length)) : value;
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <code className="flex-1 break-all text-xs">{display}</code>
        {secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-text"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
        <CopyButton value={value} className="shrink-0" />
      </div>
    </div>
  );
}

export function ConnectionMethods({
  methods,
  hasPassword,
}: {
  methods: ConnMethod[];
  hasPassword: boolean;
}) {
  const [active, setActive] = useState<ConnMethod["key"]>(methods[0].key);
  const m = methods.find((x) => x.key === active) ?? methods[0];

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-medium">Database Connection Methods</h2>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-border">
        {methods.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setActive(x.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition",
              active === x.key
                ? "border-primary text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {x.label}
            {x.recommended && " (Recommended)"}
          </button>
        ))}
      </div>

      <p className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted">
        ℹ {m.description}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Host" value={m.host} />
        <Field label="Port" value={String(m.port)} />
        <Field label="Database Name" value={m.database} className="sm:col-span-2" />
        <Field label="Username" value={m.username} />
        {hasPassword && m.password ? (
          <Field label="Password" value={m.password} secret />
        ) : (
          <div className="space-y-1.5">
            <span className="text-sm text-muted">Password</span>
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
              Tidak tersimpan — “Reset password” di tab Settings untuk menampilkan.
            </div>
          </div>
        )}
        <Field
          label="Connection String"
          value={m.connectionString}
          className="sm:col-span-2"
        />
      </div>
    </section>
  );
}
