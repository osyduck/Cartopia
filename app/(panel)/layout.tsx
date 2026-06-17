import { LogOut } from "lucide-react";
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
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </PanelShell>
  );
}
