"use client";

import { useState } from "react";
import { NavLink } from "@/components/nav-link";

const NAV = [
  { href: "/", icon: "▦", label: "Overview" },
  { href: "/databases", icon: "🗄", label: "Databases" },
  { href: "/audit", icon: "📜", label: "Audit log" },
];

export function PanelShell({
  email,
  logout,
  children,
}: {
  email: string;
  logout: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="-ml-1 rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-text"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="flex items-center gap-2">
          <span className="text-lg">🐘</span>
          <span className="font-semibold">Cartopia</span>
        </span>
      </header>

      {/* Backdrop (mobile, when drawer open) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar — static on desktop, slide-in drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface p-4 transition-transform duration-200 ease-out motion-reduce:transition-none md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <span className="flex items-center gap-2">
            <span className="text-xl">🐘</span>
            <span className="font-semibold">Cartopia</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-text md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Closing on click handles link navigation on mobile */}
        <nav
          onClick={() => setOpen(false)}
          className="flex flex-1 flex-col gap-1"
        >
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} icon={n.icon}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-2 text-xs text-muted">{email}</p>
          <div className="mt-2">{logout}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
