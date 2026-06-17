import { cn } from "@/lib/cn";

/**
 * Cartopia brand mark — an abstracted database stack with a node accent.
 * Drop-in replacement for the old 🐘 emoji. Renders in currentColor so it
 * inherits text color; pass a className to size/recolor.
 *
 * The mark reads as "managed data" (stacked discs) + "topology" (the node
 * dot) without being literal, and stays legible at 16px.
 */
export function BrandMark({
  className,
  withNode = true,
}: {
  className?: string;
  withNode?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      {/* Top disc */}
      <ellipse
        cx="16"
        cy="8"
        rx="11"
        ry="4.2"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Mid + bottom discs — drawn as arcs to imply the cylinder body */}
      <path
        d="M5 8v8c0 2.3 4.9 4.2 11 4.2S27 18.3 27 16V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 16v8c0 2.3 4.9 4.2 11 4.2s11-1.9 11-4.2v-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Node accent — suggests multi-instance topology */}
      {withNode && (
        <>
          <circle cx="25.5" cy="25.5" r="3.4" fill="currentColor" />
          <circle cx="25.5" cy="25.5" r="1.2" fill="oklch(0.10 0 0)" />
        </>
      )}
    </svg>
  );
}
