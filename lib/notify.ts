export type Notification = {
  level: "info" | "warning" | "critical";
  title: string;
  detail?: string;
};

// Pluggable alert sink. Today: structured console log (visible in worker output)
// — quota events are also persisted to the DB and surfaced in the UI.
// Future: wire an SMTP / webhook transport here behind an env flag.
export async function notify(n: Notification): Promise<void> {
  const tag =
    n.level === "critical" ? "🔴" : n.level === "warning" ? "🟡" : "🔵";
  console.log(
    `[notify] ${tag} ${n.title}${n.detail ? ` — ${n.detail}` : ""}`,
  );
}
