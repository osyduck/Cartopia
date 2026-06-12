"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { runAllBackups, pruneOldBackups } from "@/lib/services/backups";

export async function backupNowAction(): Promise<void> {
  await requireSession();
  await runAllBackups();
  await pruneOldBackups();
  revalidatePath("/backups");
}
