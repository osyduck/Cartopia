import { cn } from "@/lib/cn";

type Tone = "success" | "warning" | "danger" | "muted" | "primary" | "info";

const tones: Record<Tone, string> = {
  success: "bg-success/14 text-success border-success/20",
  warning: "bg-warning/14 text-warning border-warning/20",
  danger: "bg-danger/14 text-danger border-danger/22",
  muted: "bg-surface-2 text-muted border-border",
  primary: "bg-primary/14 text-primary border-primary/22",
  info: "bg-info/14 text-info border-info/20",
};

const dot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-faint",
  primary: "bg-primary",
  info: "bg-info",
};

export function Badge({
  tone = "muted",
  dot: withDot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-5",
        tones[tone],
        className,
      )}
    >
      {withDot && (
        <span className={cn("size-1.5 rounded-full", dot[tone])} />
      )}
      {children}
    </span>
  );
}
