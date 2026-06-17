"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
        active
          ? "bg-primary/12 text-text"
          : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {/* Active indicator — amber bar on the leading edge */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-150",
          active
            ? "text-primary"
            : "text-faint group-hover:text-muted",
        )}
      />
      {children}
    </Link>
  );
}
