"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
  faScaleBalanced,
  faPaperPlane,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { RejectDialog } from "./RejectDialog";
import { AppraiserPackModal, type PackItem } from "./AppraiserPackModal";
import { promoteLead, reopenLead, type ActionOutcome } from "@/app/actions";

/**
 * The four decision buttons — ALWAYS in the same right-to-left order so muscle
 * memory forms: [העבר לשמאי] [לבדיקה תכנונית] [שלח שאלות] [לא פעיל].
 * Every action reports back in plain Hebrew under the bar, so a non-technical
 * user always knows what just happened.
 */
export function ActionBar({
  leadId,
  packItems,
  compact = false,
  closed = false,
  contactEmail = null,
}: {
  leadId: string;
  packItems: PackItem[];
  compact?: boolean;
  /** When the lead is archived, the four actions are replaced by a restore. */
  closed?: boolean;
  /** Who the questions email will go to (shown in the confirm step). */
  contactEmail?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyTarget, setBusyTarget] = useState<"planning" | "questions" | null>(null);
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showPack, setShowPack] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<"planning" | "questions" | null>(null);

  const size = compact ? "sm" : "md";

  if (closed) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-500">
          הליד נמצא בארכיון — הפעולות אינן זמינות עבור ליד לא פעיל.
        </p>
        <Button
          variant="secondary"
          size={size}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              await reopenLead(leadId);
              router.refresh();
            })
          }
        >
          החזר ליד לטיפול
        </Button>
      </div>
    );
  }

  const promote = (target: "planning" | "questions") => {
    setBusyTarget(target);
    setOutcome(null);
    startTransition(async () => {
      try {
        const res = await promoteLead(leadId, target);
        setOutcome(res);
      } catch {
        setOutcome({ ok: false, message: "הפעולה נכשלה. נסו שוב." });
      } finally {
        setBusyTarget(null);
      }
      router.refresh();
    });
  };

  const questionsBusy = pending && busyTarget === "questions";
  const planningBusy = pending && busyTarget === "planning";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size={size}
          icon={faScaleBalanced}
          onClick={() => setShowPack(true)}
          disabled={pending}
        >
          העבר לשמאי
        </Button>
        <Button
          variant="secondary"
          size={size}
          icon={planningBusy ? undefined : faBuildingColumns}
          onClick={() => setConfirmTarget("planning")}
          disabled={pending}
        >
          {planningBusy ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              מעביר…
            </>
          ) : (
            "לבדיקה תכנונית"
          )}
        </Button>
        <Button
          variant="secondary"
          size={size}
          icon={questionsBusy ? undefined : faPaperPlane}
          onClick={() => setConfirmTarget("questions")}
          disabled={pending}
        >
          {questionsBusy ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              מכין שאלות…
            </>
          ) : (
            "שלח שאלות"
          )}
        </Button>
        <Button
          variant="danger"
          size={size}
          icon={faCircleXmark}
          onClick={() => setShowReject(true)}
          disabled={pending}
        >
          לא פעיל
        </Button>
      </div>

      {questionsBusy && (
        <p className="mt-2 text-sm text-ink-500">
          המערכת בודקת מה חסר ומנסחת שאלות מותאמות — זה לוקח כחצי דקה.
        </p>
      )}

      {outcome && !pending && (
        <p
          className={cn(
            "mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
            outcome.ok ? "bg-go-50 text-go-700" : "bg-stop-50 text-stop-700",
          )}
        >
          <FontAwesomeIcon
            icon={outcome.ok ? faCircleCheck : faCircleExclamation}
            className="mt-0.5"
          />
          <span>{outcome.message}</span>
        </p>
      )}

      <Modal
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title={confirmTarget === "questions" ? "שליחת שאלות השלמה" : "העברה לבדיקה תכנונית"}
        size="sm"
      >
        <p className="text-sm text-ink-700 leading-relaxed">
          {confirmTarget === "questions"
            ? `המערכת תבדוק מה עדיין חסר בליד, תנסח שאלות מותאמות ותשלח טופס למילוי במייל אל ${contactEmail ?? "איש הקשר של הליד"}.`
            : "הליד יסומן כנמצא בבדיקה תכנונית, ותאריך ההעברה יירשם ביומן הפעילות."}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              const t = confirmTarget;
              setConfirmTarget(null);
              if (t) promote(t);
            }}
          >
            {confirmTarget === "questions" ? "אישור ושליחה" : "אישור והעברה"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmTarget(null)}>
            ביטול
          </Button>
        </div>
      </Modal>

      <AppraiserPackModal
        leadId={leadId}
        items={packItems}
        open={showPack}
        onClose={() => setShowPack(false)}
        onDone={() => {
          setOutcome({
            ok: true,
            message: "הליד הועבר לבדיקה כלכלית (שמאי) ונרשם ביומן הפעילות.",
          });
          router.refresh();
        }}
      />
      <RejectDialog
        leadId={leadId}
        open={showReject}
        onClose={() => setShowReject(false)}
        onDone={() => router.refresh()}
      />
    </>
  );
}
