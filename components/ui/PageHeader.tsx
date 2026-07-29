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
    // Headings are the one place the brand spends size instead of weight, so
    // they need real scale and real air beneath them to land.
    <div className="flex items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-4xl sm:text-5xl font-light text-ink-900 tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-ink-500 mt-2.5 text-[0.9375rem]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
