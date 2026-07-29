import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import type { Lead } from "@/lib/domain/types";
import { VERDICT_LABEL } from "@/lib/domain/enums";
import { verdictTone } from "@/lib/status";
import { densityView } from "@/lib/leads/density";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

/**
 * The decision hero.
 *
 * The product's visual signature is the dark brand band, so the bottom line sits on one
 * — not on a saturated red/amber fill, which reads as an error toast and belongs
 * to no brand in particular. Status still carries color, but as a thin rule and
 * a small word rather than a wash, which keeps the band legible and lets the two
 * numbers do the talking.
 *
 * Density leads because it is the actual go/no-go the team decides on; the
 * weighted score is real but secondary, so it's set small and quiet beside it.
 */

/** Status accent — a hairline and a label color, never a background wash. */
const TONE_RULE: Record<string, string> = {
  go: "bg-go-500",
  warn: "bg-warn-500",
  stop: "bg-stop-500",
  brand: "bg-brand-600",
  neutral: "bg-line",
};

const TONE_TEXT: Record<string, string> = {
  go: "text-go-700",
  warn: "text-warn-700",
  stop: "text-stop-700",
  brand: "text-ink-500",
  neutral: "text-ink-500",
};

export function VerdictBanner({
  lead,
  compact = false,
}: {
  lead: Lead;
  compact?: boolean;
}) {
  const grade = lead.grade;
  const verdict = grade?.verdict ?? "review";
  const tone = verdictTone(verdict);
  const needsCure = grade ? !grade.economicsReady : false;
  const dens = densityView(lead);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-surface",
        compact ? "px-4 py-3.5" : "px-5 py-4",
      )}
    >
      {/* Status accent: a single hairline along the inline-start edge. */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 start-0 w-1", TONE_RULE[tone])}
      />

      {/* flex-wrap, and the figures below are allowed to shrink: on a phone this
          row needed ~687px inside a 354px card, and because the stats block was
          shrink-0 the whole of it — density and score both — was laid out off
          the inline-start edge and clipped away entirely. */}
      <div className={cn("flex flex-wrap items-end justify-between gap-x-5 gap-y-4")}>
        <div className="min-w-0">
          <p className="t-eyebrow">המלצת המערכת</p>
          <p
            className={cn(
              "mt-1 font-semibold leading-tight text-ink-900",
              compact ? "text-lg" : "text-2xl",
            )}
          >
            {VERDICT_LABEL[verdict]}
          </p>
          {!compact && needsCure && (
            <p className={cn("mt-2 text-sm", TONE_TEXT[tone])}>
              יש לטפל בדגלים האדומים לפני העברה לשמאי
            </p>
          )}
        </div>

        {/* The two numbers, density first — it's the metric the call turns on. */}
        <div className="flex items-end gap-5">
          {dens.num != null && (
            <div className="text-end">
              <p className="t-eyebrow">צפיפות קיימת</p>
              <p
                className={cn(
                  "font-semibold leading-none ltr-nums text-ink-900",
                  compact ? "text-2xl" : "text-[2.5rem]",
                )}
              >
                {dens.text}
              </p>
              <p className="mt-1 text-[0.6875rem] text-ink-500">יח״ד לדונם</p>
            </div>
          )}

          {grade?.score != null && (
            <Tooltip content="ציון פנימי משוקלל מ-0 עד 100, המסכם כלכלה, תכנון, רצינות, אסטרטגיה ולוח זמנים. ניתן לכוונון במסך ההגדרות.">
              <div className="text-end border-s border-line ps-5">
                <p className="t-eyebrow">
                  ציון
                  <FontAwesomeIcon icon={faCircleInfo} className="ms-1 text-[0.9em]" />
                </p>
                <p
                  className={cn(
                    "font-semibold leading-none text-ink-700",
                    compact ? "text-lg" : "text-xl",
                  )}
                >
                  <span className="ltr-nums">{grade.score}</span>
                </p>
                <p className="mt-1 text-[0.6875rem] text-ink-500">מתוך 100</p>
              </div>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
