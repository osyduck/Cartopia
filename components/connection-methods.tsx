"use client";

import { useState } from "react";
import { Info, Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/badge";
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
  const display =
    secret && !show ? "•".repeat(Math.min(28, value.length)) : value;
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <code className="flex-1 break-all font-mono text-xs">{display}</code>
        {secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted transition-colors duration-150 hover:border-border-strong hover:text-text"
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
  const [copied, setCopied] = useState(false);
  const m = methods.find((x) => x.key === active) ?? methods[0];

  function copyEnv() {
    const lines = [
      `PGHOST=${m.host}`,
      `PGPORT=${m.port}`,
      `PGDATABASE=${m.database}`,
      `PGUSER=${m.username}`,
      ...(m.password ? [`PGPASSWORD=${m.password}`] : []),
      `DATABASE_URL=${m.connectionString}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface elevation-1 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Database Connection Methods</h2>
        <button
          type="button"
          onClick={copyEnv}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
            copied
              ? "border-success/30 bg-success/10 text-success"
              : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-text",
          )}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy .env"}
        </button>
      </div>

      {/* Method switcher — segmented control */}
      <div className="mt-4 inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
        {methods.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setActive(x.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
              active === x.key
                ? "bg-surface text-text elevation-1"
                : "text-muted hover:text-text",
            )}
          >
            {x.label}
            {x.recommended && (
              <Badge tone="primary" className="ml-0.5">
                Recommended
              </Badge>
            )}
          </button>
        ))}
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-lg border border-info/20 bg-info/8 px-3 py-2 text-sm text-muted">
        <Info className="size-4 shrink-0 text-info" />
        <span>{m.description}</span>
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
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-faint">
              Not stored — reset in Settings to reveal.
            </div>
          </div>
        )}
        <Field
          label="Connection String"
          value={m.connectionString}
          secret
          className="sm:col-span-2"
        />
      </div>
    </section>
  );
}
