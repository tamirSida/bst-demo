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
 * BST's visual signature is the dark-olive band, so the bottom line sits on one
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
  brand: "bg-logo-cream/40",
  neutral: "bg-logo-cream/40",
};

const TONE_TEXT: Record<string, string> = {
  go: "text-go-100",
  warn: "text-warn-100",
  stop: "text-stop-100",
  brand: "text-logo-cream/70",
  neutral: "text-logo-cream/70",
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
        "relative overflow-hidden rounded-xl bg-brand-600 text-logo-cream",
        compact ? "px-4 py-3.5" : "px-6 py-5",
      )}
    >
      {/* Status accent: a single hairline along the inline-start edge. */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 start-0 w-[3px]", TONE_RULE[tone])}
      />

      <div className={cn("flex items-end justify-between gap-5")}>
        <div className="min-w-0">
          <p className="t-eyebrow !text-logo-cream/55">המלצת המערכת</p>
          <p
            className={cn(
              "mt-1 font-light leading-none",
              compact ? "text-xl" : "text-3xl",
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
        <div className="flex shrink-0 items-end gap-5">
          {dens.num != null && (
            <div className="text-end">
              <p className="t-eyebrow !text-logo-cream/55">צפיפות קיימת</p>
              <p
                className={cn(
                  "font-light leading-none ltr-nums",
                  compact ? "text-2xl" : "text-4xl",
                )}
              >
                {dens.text}
              </p>
              <p className="mt-1 text-[0.6875rem] text-logo-cream/55">יח״ד לדונם</p>
            </div>
          )}

          {grade?.score != null && (
            <Tooltip content="ציון פנימי משוקלל מ-0 עד 100, המסכם כלכלה, תכנון, רצינות, אסטרטגיה ולוח זמנים. ניתן לכוונון במסך ההגדרות.">
              <div className="text-end border-s border-logo-cream/20 ps-5">
                <p className="t-eyebrow !text-logo-cream/55">
                  ציון
                  <FontAwesomeIcon icon={faCircleInfo} className="ms-1 text-[0.9em]" />
                </p>
                <p
                  className={cn(
                    "font-light leading-none text-logo-cream/80",
                    compact ? "text-xl" : "text-2xl",
                  )}
                >
                  <span className="ltr-nums">{grade.score}</span>
                </p>
                <p className="mt-1 text-[0.6875rem] text-logo-cream/55">מתוך 100</p>
              </div>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
