import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/status";

const TONE_MARK: Record<Tone, string> = {
  go: "bg-go-600",
  warn: "bg-warn-600",
  stop: "bg-stop-600",
  brand: "bg-brand-600",
  neutral: "bg-ink-400",
};

/**
 * צפיפות — the number the whole decision turns on, and therefore the only
 * number on the row allowed to be large.
 *
 * Under it sits the lead's position within the CURRENT BOOK's density range,
 * not against fixed policy thresholds. That distinction is deliberate: the
 * config thresholds are not this client's real underwriting numbers, so drawing
 * them as an axis would assert a rule that doesn't exist. A lead's rank among
 * the leads actually on screen is true regardless, and it is the comparison a
 * reader is making anyway — "is this one dense, for this book?"
 *
 * The scale is shared across every row (min..max of the visible set), so bar
 * lengths are comparable down the column. A per-row scale would look the same
 * and mean nothing.
 */
export function DensityCell({
  text,
  value,
  tone,
  min,
  max,
}: {
  /** Formatted value, e.g. "9.2" or "—". */
  text: string;
  /** Raw units-per-dunam, or null when inputs are missing. */
  value: number | null;
  tone: Tone;
  /** Range across the visible rows — the shared scale. */
  min: number | null;
  max: number | null;
}) {
  const hasRange = value != null && min != null && max != null && max > min;
  // Clamp to a visible sliver at the bottom of the range so the lowest lead
  // still reads as "a mark near the start" rather than as missing data.
  const pct = hasRange ? 4 + ((value - min) / (max - min)) * 96 : null;

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={cn(
          "ltr-nums text-[1.375rem] font-semibold leading-none tracking-tight",
          value == null ? "text-ink-400" : "text-ink-900",
        )}
      >
        {text}
      </span>
      {pct != null && (
        // Track is the paper, not a filled bar: the mark is what carries the
        // information, and a bar would read as a progress meter toward a goal.
        <span aria-hidden className="relative block h-[3px] w-full rounded-full bg-surface-muted">
          <span
            className={cn("absolute top-0 h-full w-[3px] rounded-full", TONE_MARK[tone])}
            style={{ insetInlineStart: `calc(${pct}% - 3px)` }}
          />
        </span>
      )}
    </div>
  );
}
