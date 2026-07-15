"use client";

import { cn } from "@/lib/cn";

/** An accessible on/off switch. Used for boolean form answers and filters. */
export function Toggle({
  checked,
  onChange,
  labelOn = "כן",
  labelOff = "לא",
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 h-11 px-1.5 rounded-full border transition-colors select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        checked ? "bg-go-50 border-go-100" : "bg-surface-muted border-line",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <span
        className={cn(
          "inline-block w-6 h-6 rounded-full bg-white shadow-card transition-transform",
          // RTL: knob starts at the inline-end and slides toward inline-start when on
          checked ? "-translate-x-6" : "translate-x-0",
        )}
      />
      <span
        className={cn(
          "px-2 text-sm font-semibold",
          checked ? "text-go-700" : "text-ink-500",
        )}
      >
        {checked ? labelOn : labelOff}
      </span>
    </button>
  );
}
