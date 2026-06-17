"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { isValidIdentifier } from "@/lib/dataplane/identifiers";
import {
  runAllBackups,
  pruneOldBackups,
  restoreBackup,
} from "@/lib/services/backups";
import type { ActionState } from "@/app/(panel)/databases/actions";

export async function backupNowAction(): Promise<void> {
  await requireSession();
  await runAllBackups();
  await pruneOldBackups();
  revalidatePath("/backups");
}

const restoreSchema = z.object({
  backupId: z.uuid(),
  newName: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidIdentifier, "Hanya huruf kecil, angka, underscore (mulai huruf).")
    .refine((v) => v.length <= 56, "Maks 56 karakter."),
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
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
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
        title: `Restore ke database "${r.databaseName}" berhasil`,
        role: r.ownerRole,
        password: r.password,
        connectionString: r.connectionString,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
