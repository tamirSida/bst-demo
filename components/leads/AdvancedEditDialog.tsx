"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faCode } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { updateLeadAdvanced, type ActionOutcome } from "@/app/actions";
import { cn } from "@/lib/cn";

/**
 * Power-user editor: shows the lead's JSON and lets you edit values or add
 * fields. Identity/computed fields are protected server-side and unknown keys
 * land in `extra` (see lib/domain/leadEdit.ts). Saving re-grades the lead.
 */
export function AdvancedEditDialog({
  leadId,
  initialJson,
}: {
  leadId: string;
  initialJson: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(initialJson);
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  const openDialog = () => {
    setJson(initialJson);
    setOutcome(null);
    setOpen(true);
  };

  const close = () => {
    if (!pending) setOpen(false);
  };

  const save = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setOutcome({ ok: false, message: "JSON לא תקין — בדקו סוגריים, מרכאות ופסיקים." });
      return;
    }
    setOutcome(null);
    startTransition(async () => {
      const res = await updateLeadAdvanced(leadId, parsed);
      setOutcome(res);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" icon={faCode} onClick={openDialog}>
        עריכה מתקדמת
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="עריכה מתקדמת (JSON)"
        size="lg"
        footer={
          <>
            <Button variant="primary" onClick={save} loading={pending}>
              שמירה
            </Button>
            <Button variant="ghost" onClick={close} disabled={pending}>
              ביטול
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-500 leading-relaxed mb-3">
          עריכת נתוני הליד ישירות. שדות מזהים (<span className="ltr-nums">id</span>,{" "}
          <span className="ltr-nums">threadKey</span>) ושדות מחושבים (
          <span className="ltr-nums">flags</span>, <span className="ltr-nums">grade</span>) מנוהלים
          אוטומטית ולא יושפעו. שדות חדשים שתוסיפו יישמרו תחת <span className="ltr-nums">extra</span>.
          עם השמירה הליד ינוקד מחדש.
        </p>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          dir="ltr"
          spellCheck={false}
          rows={18}
          aria-label="JSON של הליד"
          className="w-full rounded-lg border border-line bg-surface-muted/40 px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        {outcome && (
          <p
            className={cn(
              "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
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
      </Modal>
    </>
  );
}
