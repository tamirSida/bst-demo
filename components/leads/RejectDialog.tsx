"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { markInactive } from "@/app/actions";
import { REJECTION_REASON_LABEL, RejectionReason } from "@/lib/domain/enums";

/**
 * Rejection with a coded reason (feeds the archive flywheel). Two-step on
 * purpose: pick a reason chip, then a distinct confirm button — this archives
 * the lead, so a stray tap must never fire it.
 */
export function RejectDialog({
  leadId,
  open,
  onClose,
  onDone,
}: {
  leadId: string;
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<RejectionReason | null>(null);

  const reasons = Object.values(RejectionReason);

  const confirm = () => {
    if (!chosen) return;
    startTransition(async () => {
      await markInactive(leadId, chosen);
      onDone?.();
      onClose();
      setChosen(null);
    });
  };

  const close = () => {
    if (pending) return;
    setChosen(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="סימון הליד כלא פעיל" size="md">
      <p className="text-ink-500 text-sm mb-4">
        בחרו סיבה ואשרו. הליד יעבור לארכיון וישמש כזיכרון מוסדי לפניות עתידיות.
      </p>
      <div className="flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <Chip
            key={reason}
            selected={chosen === reason}
            onClick={() => !pending && setChosen(reason)}
          >
            {REJECTION_REASON_LABEL[reason]}
          </Chip>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button
          variant="danger"
          onClick={confirm}
          disabled={!chosen || pending}
          loading={pending}
        >
          {pending ? "שומר…" : "אישור — סמן כלא פעיל"}
        </Button>
        <Button variant="ghost" onClick={close} disabled={pending}>
          ביטול
        </Button>
      </div>
    </Modal>
  );
}
