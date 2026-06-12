"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isValidIdentifier } from "@/lib/dataplane/identifiers";
import {
  provisionDatabase,
  deleteDatabase,
  setReadOnly,
  addRole,
  deleteRole,
  resetRolePassword,
} from "@/lib/services/databases";
import { runQuotaSweep } from "@/lib/services/quota";

const identifier = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isValidIdentifier, "Hanya huruf kecil, angka, dan underscore (mulai dengan huruf), maks 63 karakter.");

// State carries a one-time secret block to show after creation.
export type SecretReveal = {
  title: string;
  role: string;
  password: string;
  connectionString: string;
};

export type ActionState = {
  error?: string;
  reveal?: SecretReveal;
};

const createSchema = z.object({
  name: identifier.refine((v) => v.length <= 56, "Maks 56 karakter."),
  quotaMb: z.coerce.number().int().min(0).max(10_485_760).default(0),
  connectionLimit: z.coerce.number().int().min(-1).max(10_000).default(-1),
});

export async function createDatabaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    quotaMb: formData.get("quotaMb") || 0,
    connectionLimit: formData.get("connectionLimit") || -1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  try {
    const result = await provisionDatabase({
      name: parsed.data.name,
      quotaBytes: parsed.data.quotaMb > 0 ? parsed.data.quotaMb * 1024 * 1024 : null,
      connectionLimit: parsed.data.connectionLimit,
      actor: session.email,
    });
    revalidatePath("/databases");
    return {
      reveal: {
        title: `Database "${parsed.data.name}" dibuat`,
        role: result.ownerRole,
        password: result.password,
        connectionString: result.connectionString,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function runSweepAction(): Promise<void> {
  await requireSession();
  await runQuotaSweep();
  revalidatePath("/databases");
  revalidatePath("/");
}

export async function deleteDatabaseAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id"));
  await deleteDatabase(id, session.email);
  revalidatePath("/databases");
  redirect("/databases");
}

export async function toggleReadOnlyAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get("id"));
  const readOnly = formData.get("readOnly") === "true";
  await setReadOnly(id, readOnly, session.email);
  revalidatePath(`/databases/${id}`);
}

const addRoleSchema = z.object({
  databaseId: z.uuid(),
  roleName: identifier.refine((v) => v.length <= 63, "Maks 63 karakter."),
  mode: z.enum(["read", "readwrite"]),
  connectionLimit: z.coerce.number().int().min(-1).max(10_000).default(-1),
});

export async function addRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = addRoleSchema.safeParse({
    databaseId: formData.get("databaseId"),
    roleName: formData.get("roleName"),
    mode: formData.get("mode"),
    connectionLimit: formData.get("connectionLimit") || -1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  try {
    const result = await addRole({
      databaseId: parsed.data.databaseId,
      roleName: parsed.data.roleName,
      mode: parsed.data.mode,
      connectionLimit: parsed.data.connectionLimit,
      actor: session.email,
    });
    revalidatePath(`/databases/${parsed.data.databaseId}`);
    return {
      reveal: {
        title: `Role "${result.roleName}" dibuat`,
        role: result.roleName,
        password: result.password,
        connectionString: result.connectionString,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const roleId = String(formData.get("roleId"));
  const databaseId = String(formData.get("databaseId"));
  await deleteRole(roleId, session.email);
  revalidatePath(`/databases/${databaseId}`);
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const roleId = String(formData.get("roleId"));
  const databaseId = String(formData.get("databaseId"));
  try {
    const result = await resetRolePassword(roleId, session.email);
    revalidatePath(`/databases/${databaseId}`);
    return {
      reveal: {
        title: `Password "${result.roleName}" direset`,
        role: result.roleName,
        password: result.password,
        connectionString: result.connectionString,
      },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
