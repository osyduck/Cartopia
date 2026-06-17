"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Activity, Archive, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: LucideIcon };

// Icons are component refs (objects with methods) — Next.js forbids passing
// them Server→Client, so the list lives inside this client component.
export function DbTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: base, label: "Overview", icon: Database },
    { href: `${base}/monitor`, label: "Monitor", icon: Activity },
    { href: `${base}/backups`, label: "Backups", icon: Archive },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Database sections"
    >
      {tabs.map((t) => {
        const active =
          t.href === base ? pathname === base : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors duration-150",
              active
                ? "border-primary text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            <Icon
              className={cn(
                "size-4 transition-colors duration-150",
                active ? "text-primary" : "text-faint",
              )}
            />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
