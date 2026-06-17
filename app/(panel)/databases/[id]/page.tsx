import { notFound } from "next/navigation";
import {
  getDatabaseDetail,
  buildConnectionMethods,
} from "@/lib/services/databases";
import { ConnectionMethods } from "@/components/connection-methods";

export const dynamic = "force-dynamic";

export default async function DatabaseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDatabaseDetail(id);
  if (!detail) notFound();

  const methods = buildConnectionMethods({
    instance: detail.instance,
    dbName: detail.database.name,
    username: detail.database.ownerRole,
    password: detail.ownerPassword,
  });

  return (
    <ConnectionMethods
      methods={methods}
      hasPassword={detail.ownerPassword != null}
    />
  );
}
