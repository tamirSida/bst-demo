"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { markInactive } from "@/app/actions";
import { REJECTION_REASON_LABEL, RejectionReason } from "@/lib/domain/enums";

/**
 * One-tap rejection. The grid of reason chips is the ONLY required input in the
 * whole app: tap a reason → the lead is archived with that coded reason (feeds
 * the archive flywheel). No free text, no confirmation friction.
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

  const submit = (reason: RejectionReason) => {
    setChosen(reason);
    startTransition(async () => {
      await markInactive(leadId, reason);
      onDone?.();
      onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="סימון הליד כלא פעיל" size="md">
      <p className="text-ink-500 text-sm mb-4">
        בחרו סיבה אחת. הליד יעבור לארכיון וישמש כזיכרון מוסדי לפניות עתידיות.
      </p>
      <div className="flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <Chip
            key={reason}
            selected={chosen === reason}
            onClick={() => !pending && submit(reason)}
          >
            {REJECTION_REASON_LABEL[reason]}
          </Chip>
        ))}
      </div>
      {pending && (
        <div className="mt-4 flex justify-start">
          <Button variant="ghost" loading>
            שומר…
          </Button>
        </div>
      )}
    </Modal>
  );
}
