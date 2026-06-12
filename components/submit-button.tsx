"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingText,
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "ghost";
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-primary text-primary-fg hover:opacity-90",
    danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
    ghost: "bg-surface-2 text-text border border-border hover:bg-border/40",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles,
        className,
      )}
    >
      {pending && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
