"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A click-triggered popover anchored under its trigger. Closes on outside click
 * and Escape. Used by FlagChip to reveal the rule/detail/cure. No portal — it
 * positions relative to an inline-block wrapper.
 */
export function Popover({
  trigger,
  children,
  className,
  align = "start",
}: {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 w-72 max-w-[85vw] rounded-lg border border-line bg-surface shadow-pop p-4",
            align === "start" ? "start-0" : "end-0",
            className,
          )}
          role="dialog"
        >
          {children}
        </div>
      )}
    </div>
  );
}
