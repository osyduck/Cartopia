"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function DbTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: base, label: "Overview", icon: "🗄" },
    { href: `${base}/monitor`, label: "Monitor", icon: "📊" },
    { href: `${base}/backups`, label: "Backups", icon: "💾" },
    { href: `${base}/settings`, label: "Settings", icon: "⚙" },
  ];

  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active =
          t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition",
              active
                ? "border-primary text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            <span>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
