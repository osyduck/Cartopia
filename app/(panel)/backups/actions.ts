"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { isValidIdentifier } from "@/lib/dataplane/identifiers";
import {
  runBackup,
  pruneOldBackups,
  restoreBackup,
} from "@/lib/services/backups";
import type { ActionState } from "@/app/(panel)/databases/actions";

/** Back up a single database (used from its per-database Backups tab). */
export async function backupDatabaseNowAction(formData: FormData): Promise<void> {
  await requireSession();
  const databaseId = String(formData.get("databaseId"));
  await runBackup(databaseId);
  await pruneOldBackups();
  revalidatePath(`/databases/${databaseId}/backups`);
}

const restoreSchema = z.object({
  backupId: z.uuid(),
  newName: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidIdentifier, "Lowercase letters, digits, underscores (start with a letter).")
    .refine((v) => v.length <= 56, "Max 56 characters."),
});

export async function restoreBackupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = restoreSchema.safeParse({
    backupId: formData.get("backupId"),
    newName: formData.get("newName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const r = await restoreBackup(
      parsed.data.backupId,
      parsed.data.newName,
      session.email,
    );
    revalidatePath("/backups");
    revalidatePath("/databases");
    return {
      reveal: {
        title: `Restore to database "${r.databaseName}" succeeded`,
        role: r.ownerRole,
        password: r.password,
        connectionString: r.connectionString,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
