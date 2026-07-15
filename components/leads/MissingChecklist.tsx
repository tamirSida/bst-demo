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

  // The actual gaps come first (amber, prominent); completed items collapse
  // into a muted "done" block underneath.
  const missing = form.questions.filter((q) => !answered(form, q.key));
  const completed = form.questions.filter((q) => answered(form, q.key));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-ink-700">מה חסר להשלמה</p>
        <span className="text-xs font-semibold text-ink-400 ltr-nums">
          {done}/{total}
        </span>
      </div>
      {missing.length === 0 && (
        <p className="text-sm text-go-700 font-medium">כל הפרטים התקבלו — אין חוסרים.</p>
      )}
      <ul className="space-y-1">
        {missing.map((q) => (
          <li key={q.key} className="flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faSquare} className="text-warn-500" />
            <span className="text-ink-900 font-medium">{q.label}</span>
          </li>
        ))}
      </ul>
      {completed.length > 0 && (
        <ul className={cn("space-y-1", missing.length > 0 && "mt-2 pt-2 border-t border-line")}>
          {completed.map((q) => (
            <li key={q.key} className="flex items-center gap-2 text-sm">
              <FontAwesomeIcon icon={faSquareCheck} className="text-go-600" />
              <span className="text-ink-400 line-through">{q.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
