import type { ReactNode } from "react";

/** Consistent page title block. `action` sits at the inline-end (left in RTL). */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-light text-ink-900 tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-ink-500 mt-1.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
