import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Page header: title, optional context line, the page's key figures, and its
 * primary actions — set on the page ground with a rule beneath, not inside a
 * band or a card.
 *
 * There is no backdrop here by design. A decorative graphic behind a heading
 * adds nothing a reader can use and is the first thing that dates a UI; the
 * hierarchy is carried by type size and the figures themselves.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  stats,
  progress,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** The page's live figures — the numbers it exists to produce. */
  stats?: { label: string; value: ReactNode }[];
  /**
   * The job, not the record count. Renders the outstanding figure at display
   * size with a burn-down beneath it — a list of records never empties, but a
   * triage pass does, and the header should say which one this is.
   */
  progress?: { remaining: number; total: number; remainingLabel: string; doneLabel: string };
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-6 border-b border-line pb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 text-[1.75rem] leading-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {/* No shrink-0: on a phone the toolbar is wider than the column and
            would be pushed off the inline-start edge instead of wrapping. */}
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>

      {progress && progress.total > 0 && (
        <div className="mt-5 max-w-md">
          <p className="flex items-baseline gap-2">
            <span className="ltr-nums text-[2rem] font-semibold leading-none tracking-tight text-ink-900">
              {progress.remaining}
            </span>
            <span className="text-sm text-ink-500">{progress.remainingLabel}</span>
          </p>
          <span
            aria-hidden
            className="mt-3 block h-1 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <span
              className="block h-full rounded-full bg-brand-600 transition-[width] duration-500"
              style={{
                inlineSize: `${Math.round(((progress.total - progress.remaining) / progress.total) * 100)}%`,
              }}
            />
          </span>
          <p className="mt-2 text-xs text-ink-500">
            <span className="ltr-nums">
              {progress.total - progress.remaining}/{progress.total}
            </span>{" "}
            {progress.doneLabel}
          </p>
        </div>
      )}

      {stats && stats.length > 0 && (
        <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <dd className="text-lg font-semibold leading-none text-ink-900">
                {s.value}
              </dd>
              <dt className="text-sm text-ink-500">{s.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
