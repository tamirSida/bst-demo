import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A rounded, soft-shadow surface. The workhorse container of the whole UI. */
export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag className={cn("bg-surface rounded-lg border border-line shadow-card", className)}>
      {children}
    </Tag>
  );
}

/**
 * Section header used inside cards and page sections.
 *
 * Deliberately has no icon slot. An icon beside every heading is decoration
 * that repeats what the words already say, and once it's on all ten headings it
 * stops distinguishing anything — it just adds visual noise. Size and weight
 * carry the hierarchy instead.
 */
export function CardHeader({
  title,
  count,
  action,
  className,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <h2 className="text-lg font-medium text-ink-900 truncate">{title}</h2>
        {count != null && (
          <span className="ltr-nums inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-surface-muted text-ink-500 text-sm font-medium">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
