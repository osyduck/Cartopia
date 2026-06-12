import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAudit(entry: {
  actor: string;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(auditLogs).values({
    actor: entry.actor,
    action: entry.action,
    target: entry.target ?? null,
    metadata: entry.metadata ?? null,
  });
}
