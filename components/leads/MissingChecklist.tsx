import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquare, faSquareCheck } from "@fortawesome/free-solid-svg-icons";
import type { LeadForm } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/** True when a form answer holds a real value. */
function answered(form: LeadForm, key: string): boolean {
  const a = form.answers[key];
  return !!a && a.value != null && a.value !== "";
}

/**
 * "מה חסר" — the form questions rendered as a checklist so the PM sees at a
 * glance what is still pending from the lawyer/organizer.
 */
export function MissingChecklist({ form }: { form: LeadForm }) {
  const total = form.questions.length;
  const done = form.questions.filter((q) => answered(form, q.key)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-ink-700">מה חסר להשלמה</p>
        <span className="text-xs font-semibold text-ink-400 ltr-nums">
          {done}/{total}
        </span>
      </div>
      <ul className="space-y-1">
        {form.questions.map((q) => {
          const ok = answered(form, q.key);
          return (
            <li key={q.key} className="flex items-center gap-2 text-sm">
              <FontAwesomeIcon
                icon={ok ? faSquareCheck : faSquare}
                className={ok ? "text-go-600" : "text-ink-400"}
              />
              <span className={cn(ok ? "text-ink-400 line-through" : "text-ink-700")}>
                {q.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
