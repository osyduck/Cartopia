import { requireSession } from "@/lib/auth/session";
import { NavLink } from "@/components/nav-link";
import { logout } from "./actions";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-xl">🐘</span>
          <span className="font-semibold">Cartopia</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink href="/" icon="▦">
            Overview
          </NavLink>
          <NavLink href="/databases" icon="🗄">
            Databases
          </NavLink>
          <NavLink href="/monitoring" icon="📈">
            Monitoring
          </NavLink>
          <NavLink href="/backups" icon="💾">
            Backups
          </NavLink>
          <NavLink href="/audit" icon="📜">
            Audit log
          </NavLink>
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-2 text-xs text-muted">{session.email}</p>
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-surface-2 hover:text-text"
            >
              ⎋ Logout
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-8">{children}</div>
      </main>
    </div>
  );
}
