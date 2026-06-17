import { requireSession } from "@/lib/auth/session";
import { PanelShell } from "@/components/panel-shell";
import { logout } from "./actions";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <PanelShell
      email={session.email}
      logout={
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-text"
          >
            ⎋ Logout
          </button>
        </form>
      }
    >
      {children}
    </PanelShell>
  );
}
