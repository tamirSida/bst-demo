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

  return (
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
          <span className="ltr-nums text-base font-semibold leading-none text-ink-900">
            {score}
            <span className="text-[11px] font-medium text-ink-400">/100</span>
          </span>
        )}
      </span>

      {score != null && (
        <span
          className={cn("hidden md:block h-1 w-24 rounded-full overflow-hidden", TONE_TRACK[tone])}
          aria-hidden="true"
        >
          <span className={cn("block h-full rounded-full", TONE_FILL[tone])} style={{ width: `${pct}%` }} />
        </span>
      )}

      {verdictLabel && (
        <span className={cn("text-xs font-medium whitespace-nowrap", TONE_TEXT[tone])}>
          {verdictLabel}
        </span>
      )}
    </div>
  );
}
