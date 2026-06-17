"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spin, setSpin] = useState(false);

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
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition hover:text-text"
    >
      <span className={spin || pending ? "inline-block animate-spin" : ""}>↻</span>{" "}
      Refresh
    </button>
  );
}
