import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { businessDaysUntil } from "@/lib/domain/compute";
import { cn } from "@/lib/cn";
import { TONE_SOFT, type Tone } from "@/lib/status";

/**
 * Deadline countdown expressed in Israeli business days.
 * red < 3 days · amber < 7 · neutral otherwise · red "המועד חלף" when negative.
 */
export function CountdownChip({
  deadlineIso,
  className,
}: {
  deadlineIso: string | null;
  className?: string;
}) {
  if (!deadlineIso) return null;
  const days = businessDaysUntil(deadlineIso);
  if (days == null) return null;

  let tone: Tone = "neutral";
  const overdue = days < 0;
  let label: React.ReactNode;

  if (overdue) {
    tone = "stop";
    label = "המועד חלף";
  } else if (days === 0) {
    tone = "stop";
    label = "המועד היום";
  } else {
    if (days < 3) tone = "stop";
    else if (days < 7) tone = "warn";
    else tone = "neutral";
    // Only the numeral is LTR-wrapped so the Hebrew phrase stays readable.
    label = (
      <>
        בעוד <span className="ltr-nums">{days}</span> ימי עבודה
      </>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium whitespace-nowrap",
        TONE_SOFT[tone],
        className,
      )}
    >
      <FontAwesomeIcon icon={overdue ? faTriangleExclamation : faClock} className="text-[0.85em]" />
      <span>{label}</span>
    </span>
  );
}
