import { env } from "@/lib/env";

export type Notification = {
  level: "info" | "warning" | "critical";
  title: string;
  detail?: string;
};

const TAG = { info: "🔵", warning: "🟡", critical: "🔴" } as const;

/**
 * Alert sink. Always logs (visible in worker output); also POSTs to
 * ALERT_WEBHOOK_URL when configured. The payload carries both `content`
 * (Discord) and `text` (Slack / generic) plus structured fields, so it works
 * with most webhook receivers without per-provider code.
 */
export async function notify(n: Notification): Promise<void> {
  const line = `${TAG[n.level]} ${n.title}${n.detail ? ` — ${n.detail}` : ""}`;
  console.log(`[notify] ${line}`);

  if (!env.ALERT_WEBHOOK_URL) return;
  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: line, // Discord
        text: line, // Slack / generic
        level: n.level,
        title: n.title,
        detail: n.detail ?? null,
      }),
    });
  } catch (err) {
    console.error(`[notify] webhook failed: ${(err as Error).message}`);
  }
}
