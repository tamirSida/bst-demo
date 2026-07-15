"use client";

import { useTransition } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { promoteLead } from "@/app/actions";
import { cn } from "@/lib/cn";

export interface PackItem {
  label: string;
  ready: boolean;
}

/**
 * The deliberate gate before spending money on a שמאי. Shows exactly which parts
 * of the "חבילת שמאי" are in hand (check) vs missing (X) so the PM decides with
 * eyes open. Confirm → promoteLead(appraiser).
 */
export function AppraiserPackModal({
  leadId,
  items,
  open,
  onClose,
  onDone,
}: {
  leadId: string;
  items: PackItem[];
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const missing = items.filter((i) => !i.ready).length;

  const confirm = () =>
    startTransition(async () => {
      await promoteLead(leadId, "appraiser");
      onDone?.();
      onClose();
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="העברה לשמאי — חבילת בדיקה כלכלית"
      size="md"
      footer={
        <>
          <Button variant="go" onClick={confirm} loading={pending} icon={faCircleCheck}>
            אישור העברה לשמאי
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            ביטול
          </Button>
        </>
      }
    >
      <p className="text-ink-500 text-sm mb-4">
        העברה לשמאי כרוכה בעלות. ודאו שהחומרים הבאים בידכם:
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium",
              item.ready ? "bg-go-50 text-go-700" : "bg-stop-50 text-stop-700",
            )}
          >
            <FontAwesomeIcon
              icon={item.ready ? faCircleCheck : faCircleXmark}
              className={item.ready ? "text-go-600" : "text-stop-600"}
            />
            {item.label}
          </li>
        ))}
      </ul>
      {missing > 0 && (
        <p className="text-warn-700 text-sm mt-4 font-medium">
          שימו לב: <span className="ltr-nums">{missing}</span> פריטים חסרים. ניתן להעביר בכל זאת
          לפי שיקול דעתכם.
        </p>
      )}
    </Modal>
  );
}
