import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import type { Grade } from "@/lib/domain/types";
import { VERDICT_LABEL } from "@/lib/domain/enums";
import { TONE_SOLID, verdictTone } from "@/lib/status";
import { VERDICT_ICON } from "./verdictIcon";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

/**
 * The big bottom-line recommendation. Color IS the message — a busy PM reads the
 * banner color in a glance and only then the score/text.
 */
export function VerdictBanner({
  grade,
  compact = false,
}: {
  grade: Grade | null;
  compact?: boolean;
}) {
  const verdict = grade?.verdict ?? "review";
  const tone = verdictTone(verdict);
  const needsCure = grade ? !grade.economicsReady : false;

  return (
    <div
      className={cn(
        "rounded-lg flex items-center gap-3",
        compact ? "px-3.5 py-2.5" : "px-5 py-4",
        TONE_SOLID[tone],
      )}
    >
      <FontAwesomeIcon
        icon={VERDICT_ICON[verdict]}
        className={compact ? "text-xl" : "text-2xl"}
      />
      <div className="min-w-0 flex-1">
        <div className={cn("leading-tight", compact ? "text-base font-semibold" : "text-2xl font-light")}>
          {VERDICT_LABEL[verdict]}
        </div>
        {!compact && needsCure && (
          <div className="text-white/90 text-sm mt-0.5 font-medium">
            יש לטפל בדגלים האדומים לפני העברה לשמאי
          </div>
        )}
      </div>
      {grade?.score != null && (
        <Tooltip content="ציון פנימי משוקלל מ-0 עד 100, המסכם כלכלה, תכנון, רצינות, אסטרטגיה ולוח זמנים. ניתן לכוונון במסך ההגדרות.">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-white text-ink-900 font-bold whitespace-nowrap shadow-card",
              compact ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
            )}
          >
            <span className="ltr-nums">{grade.score}</span>
            <span className="font-medium text-ink-500">מתוך 100</span>
            <FontAwesomeIcon icon={faCircleInfo} className="text-ink-400 text-xs" />
          </span>
        </Tooltip>
      )}
    </div>
  );
}
