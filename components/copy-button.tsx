"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore (e.g. insecure context)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted transition hover:text-text",
        className,
      )}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
