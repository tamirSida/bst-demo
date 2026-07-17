"use client";

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";
import { TONE_SOFT, type Tone } from "@/lib/status";

/**
 * A selectable/pressable chip — used for filters (deal-type, reject reasons).
 * When `selected`, it fills with brand; otherwise a quiet outline.
 */
export function Chip({
  children,
  selected = false,
  onClick,
  icon,
  tone,
  className,
  as = "button",
  title,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: IconDefinition;
  /** Optional forced tone (used by reject-reason chips). Overrides selected fill. */
  tone?: Tone;
  className?: string;
  as?: "button" | "span";
  title?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 h-9 text-sm font-medium transition-colors whitespace-nowrap";
  const state = selected
    ? "bg-brand-600 text-white border-brand-600 hover:bg-brand-700"
    : "bg-surface text-ink-700 border-line hover:bg-surface-muted";

  const cls = cn(base, tone ? TONE_SOFT[tone] : state, className);

  if (as === "span") {
    return (
      <span className={cls} title={title}>
        {icon && <FontAwesomeIcon icon={icon} className="text-[0.85em]" />}
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={cn(
        cls,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1",
      )}
    >
      {icon && <FontAwesomeIcon icon={icon} className="text-[0.85em]" />}
      {children}
    </button>
  );
}
