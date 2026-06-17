import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import type { SecretReveal as SecretRevealData } from "@/app/(panel)/databases/actions";

export function SecretReveal({ data }: { data: SecretRevealData }) {
  return (
    <div className="space-y-3 rounded-xl border border-success/25 bg-success/8 p-4 elevation-1">
      <div className="flex items-center gap-2 text-sm font-medium text-success">
        <CheckCircle2 className="size-4 text-success" />
        {data.title}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-warning">
        <AlertTriangle className="size-3.5 text-warning" />
        Simpan sekarang — password hanya ditampilkan sekali dan tidak disimpan.
      </p>

      <Field label="Role">
        <code className="text-sm">{data.role}</code>
      </Field>
      <Field label="Password" copy={data.password}>
        <code className="text-sm break-all">{data.password}</code>
      </Field>
      <Field label="Connection string" copy={data.connectionString}>
        <code className="text-xs break-all text-muted">
          {data.connectionString}
        </code>
      </Field>
    </div>
  );
}

function Field({
  label,
  copy,
  children,
}: {
  label: string;
  copy?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-surface-2/60 px-3 py-2">
      <div className="min-w-0">
        <div className="mb-0.5 text-[11px] uppercase tracking-wide text-faint">
          {label}
        </div>
        {children}
      </div>
      {copy && <CopyButton value={copy} className="shrink-0" />}
    </div>
  );
}
