"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

export function RefreshButton({
  label = "Refresh",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spin, setSpin] = useState(false);
  const spinning = spin || pending;

  return (
    <button
      type="button"
      onClick={() => {
        setSpin(true);
        startTransition(() => {
          router.refresh();
          setTimeout(() => setSpin(false), 600);
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:text-text hover:border-border-strong",
        className,
      )}
    >
      <RefreshCw className={cn("size-3.5", spinning && "animate-spin")} />
      {label}
    </button>
  );
}
