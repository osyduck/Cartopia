"use client";

import { useState } from "react";
import { Menu, X, LayoutDashboard, Database, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { BrandMark } from "@/components/brand-mark";

const NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/databases", icon: Database, label: "Databases" },
  { href: "/audit", icon: ScrollText, label: "Audit log" },
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
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 rounded-lg p-2 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <Menu className="size-5" />
        </button>
        <span className="flex items-center gap-2">
          <BrandMark className="size-7 text-primary" />
          <span className="font-semibold tracking-tight">Cartopia</span>
        </span>
      </header>

      {/* Backdrop (mobile, when drawer open) */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar — static on desktop, slide-in drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface p-4 elevation-3 transition-transform duration-200 ease-out motion-reduce:transition-none md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 md:elevation-1 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <span className="flex items-center gap-2">
            <BrandMark className="size-7 text-primary" />
            <span className="font-semibold tracking-tight">Cartopia</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Closing on click handles link navigation on mobile.
            Escape also closes for keyboard users. */}
        <nav
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="flex flex-1 flex-col gap-1"
        >
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} icon={n.icon}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-2 text-xs text-faint">{email}</p>
          <div className="mt-2">{logout}</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
