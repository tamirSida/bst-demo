"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faClipboardList,
  faFloppyDisk,
  faRobot,
} from "@fortawesome/free-solid-svg-icons";
import { YAZAM_CATEGORIES, YAZAM_QUESTIONS } from "@/lib/leads/yazamQuestions";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { saveYazamAction, type ActionOutcome } from "@/app/actions";

/**
 * שאלון יזם — BST's developer questionnaire for a compound. Editable per lead:
 * company answers seed from the standing answers in settings, deal-specific ones
 * start empty for manual approval. Saving persists the lead's own copy and logs
 * the timeline.
 */
export function YazamQuestionnaire({
  leadId,
  density,
  gateDensity,
  companyDefaults,
  initialAnswers,
}: {
  leadId: string;
  density: number | null;
  gateDensity: number;
  /** BST's standing company answers (config.yazamAnswers). */
  companyDefaults: Record<string, string>;
  /** This lead's saved answers (lead.extra.yazam.answers), if any. */
  initialAnswers: Record<string, string>;
}) {
  const seed = useMemo(() => {
    const m: Record<string, string> = {};
    for (const q of YAZAM_QUESTIONS) {
      m[q.key] =
        initialAnswers[q.key] ??
        (q.scope === "company" ? companyDefaults[q.key] ?? "" : "");
    }
    return m;
  }, [initialAnswers, companyDefaults]);

  const [answers, setAnswers] = useState<Record<string, string>>(seed);
  const [baseline, setBaseline] = useState(() => JSON.stringify(seed));
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = JSON.stringify(answers) !== baseline;
  const gated = density != null && density >= gateDensity;
  const filled = YAZAM_QUESTIONS.filter((q) => answers[q.key]?.trim()).length;
  const dealOpen = YAZAM_QUESTIONS.filter(
    (q) => q.scope === "deal" && !answers[q.key]?.trim(),
  ).length;

  const set = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setOutcome(null);
  };

  const save = () =>
    start(async () => {
      const res = await saveYazamAction(leadId, answers);
      setOutcome(res);
      if (res.ok) {
        setBaseline(JSON.stringify(answers));
        router.refresh();
      }
    });

  return (
    <Card>
      <CardHeader title="שאלון יזם" icon={faClipboardList} />
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm">
          <FontAwesomeIcon icon={faRobot} className="mt-0.5 text-brand-600" />
          <div>
            <p className="text-ink-700">
              {gated && density != null ? (
                <>
                  <span className="font-semibold">נפתח אוטומטית</span> — צפיפות עומדת
                  בסף: <span className="ltr-nums">{density.toFixed(1)} ≥ {gateDensity}</span>{" "}
                  יח"ד/דונם.
                </>
              ) : (
                <span className="font-semibold">שאלון יזם</span>
              )}
            </p>
            <p className="mt-0.5 text-ink-500">
              <span className="ltr-nums">
                {filled}/{YAZAM_QUESTIONS.length}
              </span>{" "}
              מולאו · <span className="ltr-nums">{dealOpen}</span> שאלות תלויות-עסקה
              ממתינות לאישור
            </p>
          </div>
        </div>

        {YAZAM_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-semibold text-ink-400">{cat}</p>
            <ul className="space-y-3">
              {YAZAM_QUESTIONS.filter((q) => q.category === cat).map((q) => {
                const empty = !answers[q.key]?.trim();
                return (
                  <li key={q.key}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label
                        htmlFor={`yazam-${q.key}`}
                        className="text-sm text-ink-800"
                      >
                        <span className="ltr-nums">{q.num}.</span> {q.text}
                      </label>
                      {q.scope === "deal" && empty && (
                        <Badge tone="warn" size="sm">
                          דורש אישור
                        </Badge>
                      )}
                    </div>
                    <textarea
                      id={`yazam-${q.key}`}
                      rows={2}
                      value={answers[q.key] ?? ""}
                      onChange={(e) => set(q.key, e.target.value)}
                      placeholder={
                        q.scope === "deal"
                          ? "תשובה תלוית-עסקה — למילוי ואישור ידני"
                          : "—"
                      }
                      className={cn(
                        "w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-100",
                        q.scope === "deal" && empty
                          ? "border-warn-300"
                          : "border-line focus:border-brand-400",
                      )}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-sm">
            {outcome ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-semibold",
                  outcome.ok ? "text-go-700" : "text-stop-700",
                )}
              >
                <FontAwesomeIcon
                  icon={outcome.ok ? faCircleCheck : faCircleExclamation}
                />
                {outcome.message}
              </span>
            ) : dirty ? (
              <span className="text-ink-500">יש שינויים שטרם נשמרו</span>
            ) : null}
          </span>
          <Button
            variant="primary"
            icon={faFloppyDisk}
            disabled={!dirty}
            loading={pending}
            onClick={save}
          >
            שמור שאלון
          </Button>
        </div>
      </div>
    </Card>
  );
}
