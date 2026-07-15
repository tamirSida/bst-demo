import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { LeadForm, FormStatus } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

// The three visible milestones of the "השלמת פרטים" flow (draft is internal).
const STEPS: { status: FormStatus; label: string }[] = [
  { status: "sent", label: "נשלח" },
  { status: "opened", label: "נפתח" },
  { status: "submitted", label: "הוגש" },
];

const ORDER: Record<FormStatus, number> = { draft: -1, sent: 0, opened: 1, submitted: 2 };

/** A 3-step progress tracker for the lawyer's questionnaire. */
export function QuestionnaireTracker({ form }: { form: LeadForm }) {
  const current = ORDER[form.status];

  return (
    <div className="rounded-lg border border-line bg-surface-muted/50 p-4">
      <p className="text-sm font-bold text-ink-700 mb-3">שאלון השלמת פרטים</p>
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const done = current >= ORDER[step.status];
          const active = current === ORDER[step.status];
          return (
            <li key={step.status} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2 transition-colors",
                    done
                      ? "bg-go-500 border-go-500 text-white"
                      : active
                        ? "bg-surface border-brand-400 text-brand-600"
                        : "bg-surface border-line text-ink-400",
                  )}
                >
                  {done ? <FontAwesomeIcon icon={faCheck} /> : <span className="ltr-nums">{i + 1}</span>}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    done ? "text-go-700" : active ? "text-brand-700" : "text-ink-400",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "flex-1 h-0.5 mx-1 -mt-5",
                    current > ORDER[step.status] ? "bg-go-500" : "bg-line",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
