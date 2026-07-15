import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCircleCheck,
  faEnvelope,
  faFileLines,
  faNoteSticky,
  faPaperclip,
  faPaperPlane,
  faPlus,
  faStar,
  faEnvelopeOpen,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { TimelineEvent, TimelineKind } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format/num";
import { EmptyState } from "@/components/ui/EmptyState";

// RTL: the pipeline moves right-to-left, so "forward" points left.
const KIND_ICON: Record<TimelineKind, IconDefinition> = {
  created: faPlus,
  email_in: faEnvelope,
  email_out: faPaperPlane,
  stage_change: faArrowLeft,
  note: faNoteSticky,
  doc_received: faPaperclip,
  form_sent: faFileLines,
  form_opened: faEnvelopeOpen,
  form_submitted: faCircleCheck,
  grade_change: faStar,
};

/** Vertical activity feed, newest first. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <EmptyState icon={faNoteSticky} title="אין פעילות עדיין" compact />
    );
  }

  return (
    <ol className="relative">
      {events.map((e, i) => (
        <li key={e.id} className="flex gap-3 pb-5 last:pb-0 relative">
          {/* connector line */}
          {i < events.length - 1 && (
            <span className="absolute top-9 bottom-0 start-[15px] w-px bg-line" aria-hidden />
          )}
          <span className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-600 shrink-0">
            <FontAwesomeIcon icon={KIND_ICON[e.kind]} className="text-sm" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-ink-900 leading-snug">{e.title}</p>
            {e.body && <p className="text-sm text-ink-500 mt-0.5">{e.body}</p>}
            <p className="text-xs text-ink-400 mt-0.5 ltr-nums">{formatDateTime(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
