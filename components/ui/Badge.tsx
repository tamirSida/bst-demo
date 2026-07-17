import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";
import { TONE_SOFT, type Tone } from "@/lib/status";

/** A small, soft-tinted status badge (verdict chip, status chip, doc-type). */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  size = "md",
}: {
  tone?: Tone;
  icon?: IconDefinition;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        TONE_SOFT[tone],
        className,
      )}
    >
      {icon && <FontAwesomeIcon icon={icon} className="text-[0.85em]" />}
      {children}
    </span>
  );
}
