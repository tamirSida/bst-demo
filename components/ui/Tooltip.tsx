import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Lightweight CSS-only tooltip (hover / focus). Good enough for source-icon
 * provenance labels and the score explainer — no JS, works in server components.
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex group", className)} tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full start-1/2 -translate-x-1/2 mb-2 z-50",
          "w-max max-w-[16rem] rounded-md bg-ink-900 px-2.5 py-1.5 text-xs text-white text-center leading-snug",
          "opacity-0 translate-y-1 transition-all duration-100",
          "group-hover:opacity-100 group-hover:translate-y-0",
          "group-focus:opacity-100 group-focus:translate-y-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
