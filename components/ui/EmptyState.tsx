import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

/** Friendly empty state — calm, never alarming. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
  compact = false,
}: {
  icon: IconDefinition;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        className,
      )}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-muted text-ink-400 mb-3">
        <FontAwesomeIcon icon={icon} className="text-2xl" />
      </div>
      <p className="text-ink-700 font-semibold">{title}</p>
      {hint && <p className="text-ink-400 text-sm mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
