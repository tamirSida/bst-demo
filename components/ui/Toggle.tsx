"use client";

import { cn } from "@/lib/cn";

/**
 * An accessible on/off switch. The knob slides inside its own track (logical
 * inset-inline positioning, so RTL is native) and the label sits OUTSIDE the
 * track — it can never be overlapped by the knob.
 */
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
        "inline-flex items-center gap-2.5 h-11 select-none",
        "focus-visible:outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-brand-400",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <span
        className={cn(
          "relative inline-block w-11 h-6 rounded-full border transition-colors",
          checked ? "bg-go-500 border-go-500" : "bg-surface-muted border-line",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-card",
            "transition-[inset-inline-start] duration-150",
            checked ? "start-[22px]" : "start-0.5",
          )}
        />
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          checked ? "text-go-700" : "text-ink-500",
        )}
      >
        {checked ? labelOn : labelOff}
      </span>
    </button>
  );
}
