import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

/** A compact labelled value tile used inside the FactSheet and headers. */
export function StatBox({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconDefinition;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-surface-muted px-4 py-3", className)}>
      <div className="flex items-center gap-1.5 text-ink-500 text-xs font-medium mb-1">
        {icon && <FontAwesomeIcon icon={icon} className="text-[0.9em]" />}
        <span>{label}</span>
      </div>
      <div className="text-ink-900 text-xl font-semibold leading-tight">{value}</div>
      {hint && <div className="text-ink-400 text-xs mt-0.5">{hint}</div>}
    </div>
  );
}
