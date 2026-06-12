"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { runMonitorSweep } from "@/lib/services/monitoring";

export async function refreshMonitoringAction(): Promise<void> {
  await requireSession();
  await runMonitorSweep();
  revalidatePath("/monitoring");
}
