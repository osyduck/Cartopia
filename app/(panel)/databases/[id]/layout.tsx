import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDatabaseDetail } from "@/lib/services/databases";
import * as dp from "@/lib/dataplane";
import { Badge } from "@/components/badge";
import { DbTabs } from "@/components/db-tabs";
import { RefreshButton } from "@/components/refresh-button";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DatabaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const { database, instance } = detail;
  const base = `/databases/${id}`;

  const version = await dp.serverVersion(instance).catch(() => "");
  const major = version.split(".")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/databases"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="size-3.5" />
            Databases
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {database.name}
            </h1>
            {database.isReadonly ? (
              <Badge tone="warning" dot>read-only</Badge>
            ) : database.status === "active" ? (
              <Badge tone="success" dot>active</Badge>
            ) : (
              <Badge tone="muted">{database.status}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {major ? `PostgreSQL v${major} · ` : ""}Created on{" "}
            {formatDate(database.createdAt)}
          </p>
        </div>
        <RefreshButton />
      </div>

      <DbTabs base={base} />

      {children}
    </div>
  );
}
