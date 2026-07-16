"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { deleteLead } from "@/app/actions";

/**
 * Permanent-delete confirm. Deliberately distinct from the archive path: the
 * copy warns that this cannot be undone and steers anyone who wants to keep the
 * record toward "לא פעיל" instead. On confirm the lead is gone, so we leave the
 * page for the list.
 */
export function DeleteDialog({
  leadId,
  leadName,
  open,
  onClose,
}: {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      await deleteLead(leadId);
      router.push("/leads");
      router.refresh();
    });
  };

  const close = () => {
    if (!pending) onClose();
  };

  return (
    <Modal open={open} onClose={close} title="מחיקת הליד לצמיתות" size="md">
      <p className="text-sm text-ink-700 leading-relaxed">
        פעולה זו תסיר את הליד{" "}
        <span className="font-semibold text-ink-900">{leadName}</span> לצמיתות —
        כולל המסמכים, הטופס ויומן הפעילות. לא ניתן לשחזר.
      </p>
      <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-ink-500 leading-relaxed">
        רוצים לשמור את התיעוד ואת סיבת הדחייה לפניות עתידיות? השתמשו ב״לא פעיל״
        במקום — הליד יעבור לארכיון ויישאר כזיכרון מוסדי.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Button
          variant="danger"
          icon={faTrashCan}
          onClick={confirm}
          loading={pending}
        >
          {pending ? "מוחק…" : "מחיקה לצמיתות"}
        </Button>
        <Button variant="ghost" onClick={close} disabled={pending}>
          ביטול
        </Button>
      </div>
    </Modal>
  );
}
