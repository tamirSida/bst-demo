import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/cn";
import { TONE_SOFT, TONE_TEXT, TONE_TRACK, TONE_FILL, type Tone } from "@/lib/status";
import type { Verdict } from "@/lib/domain/enums";
import { VERDICT_ICON } from "./verdictIcon";

/**
 * Compact traffic-light grade for the leads table row. Echoes the detail
 * VerdictBanner (same icon + color) so the list and detail read as one system:
 * a soft tinted chip with the verdict icon + 0-100 score, a thin tone meter that
 * fills the empty column width, then the verdict label. All data is pre-serialized
 * server-side (no domain logic on the client).
 */
export function GradeCell({
  score,
  verdictKey,
  verdictLabel,
  tone,
}: {
  score: number | null;
  verdictKey: Verdict | null;
  verdictLabel: string | null;
  tone: Tone | null;
}) {
  // Not yet graded — a bar or "0" would imply a real low score.
  if (verdictKey == null || tone == null) {
    return <span className="text-ink-400">—</span>;
  }

  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));

  /*
   * Two lines, not one. Laid out inline, chip + meter + verdict label needed
   * ~17rem, which pushed the whole table past its container and clipped the
   * verdict and the row-open chevron off the RTL edge entirely. Stacking the
   * label under the score reads the same and costs half the width.
   */
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
          TONE_SOFT[tone],
        )}
      >
        <FontAwesomeIcon icon={VERDICT_ICON[verdictKey]} className={cn("text-xs", TONE_TEXT[tone])} />
        {/* score omitted when a kill flag voided it (score null) */}
        {score != null && (
          <span className="ltr-nums text-base font-medium leading-none text-ink-900">
            {score}
            <span className="text-[11px] font-medium text-ink-400">/100</span>
          </span>
        )}
      </span>

      {score != null && (
        <span
          // shrink-0 or the meter collapses to 0px: it's a flex child in an
          // over-constrained row, so without it the browser takes all its width
          // back and the bar silently never renders.
          className={cn(
            "hidden md:block h-1 w-16 shrink-0 rounded-full overflow-hidden",
            TONE_TRACK[tone],
          )}
          aria-hidden="true"
        >
          <span className={cn("block h-full rounded-full", TONE_FILL[tone])} style={{ width: `${pct}%` }} />
        </span>
      )}

      </div>

      {verdictLabel && (
        <span className={cn("block truncate text-xs font-medium", TONE_TEXT[tone])}>
          {verdictLabel}
        </span>
      )}
    </div>
  );
}
