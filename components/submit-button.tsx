"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active glow-primary",
  secondary:
    "bg-surface-2 text-text border border-border hover:bg-surface-3 hover:border-border-strong",
  ghost:
    "bg-transparent text-muted hover:text-text hover:bg-surface-2",
  danger:
    "bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20 hover:border-danger/40",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingText,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
