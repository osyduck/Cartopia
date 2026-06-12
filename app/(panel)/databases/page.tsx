import Link from "next/link";
import { listDatabases } from "@/lib/services/databases";
import { CreateDatabaseForm } from "@/components/create-database-form";
import { Badge } from "@/components/badge";
import { formatBytes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DatabasesPage() {
  const dbs = await listDatabases();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Databases</h1>
        <p className="text-sm text-muted">
          {dbs.length} database dikelola
        </p>
      </div>

      <CreateDatabaseForm />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Instance</th>
              <th className="px-4 py-3 font-medium">Ukuran</th>
              <th className="px-4 py-3 font-medium">Quota</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {dbs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Belum ada database. Buat yang pertama di atas.
                </td>
              </tr>
            )}
            {dbs.map((d) => (
              <tr
                key={d.id}
                className="border-b border-border/50 last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/databases/${d.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {d.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{d.instanceName}</td>
                <td className="px-4 py-3">{formatBytes(d.sizeBytes)}</td>
                <td className="px-4 py-3 text-muted">
                  {d.quotaBytes ? formatBytes(d.quotaBytes) : "∞"}
                </td>
                <td className="px-4 py-3">
                  {d.isReadonly ? (
                    <Badge tone="warning">read-only</Badge>
                  ) : (
                    <Badge tone="success">active</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
