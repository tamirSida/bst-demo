"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  faBuildingColumns,
  faCircleXmark,
  faScaleBalanced,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { RejectDialog } from "./RejectDialog";
import { AppraiserPackModal, type PackItem } from "./AppraiserPackModal";
import { promoteLead } from "@/app/actions";

/**
 * The four decision buttons — ALWAYS in the same right-to-left order so muscle
 * memory forms: [העבר לשמאי] [לבדיקה תכנונית] [שלח שאלות] [לא פעיל].
 * "העבר לשמאי" is the primary; it opens the deliberate pack-checklist gate.
 */
export function ActionBar({
  leadId,
  packItems,
  compact = false,
}: {
  leadId: string;
  packItems: PackItem[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [showPack, setShowPack] = useState(false);

  const size = compact ? "sm" : "md";

  const promote = (target: "planning" | "questions") =>
    startTransition(async () => {
      await promoteLead(leadId, target);
      router.refresh();
    });

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
          icon={faBuildingColumns}
          onClick={() => promote("planning")}
          disabled={pending}
        >
          לבדיקה תכנונית
        </Button>
        <Button
          variant="secondary"
          size={size}
          icon={faPaperPlane}
          onClick={() => promote("questions")}
          disabled={pending}
        >
          שלח שאלות
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

      <AppraiserPackModal
        leadId={leadId}
        items={packItems}
        open={showPack}
        onClose={() => setShowPack(false)}
        onDone={() => router.refresh()}
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
