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

/**
 * Activity feed. `vertical` (default) is the newest-first list used in cards;
 * `horizontal` is a full-width chronological strip (oldest→newest, reading
 * right-to-left in RTL) for the top of the lead page.
 */
export function Timeline({
  events,
  layout = "vertical",
}: {
  events: TimelineEvent[];
  layout?: "vertical" | "horizontal";
}) {
  if (!events.length) {
    return (
      <EmptyState icon={faNoteSticky} title="אין פעילות עדיין" compact />
    );
  }

  if (layout === "horizontal") {
    // Chronological so the strip reads as a progression (RTL: oldest on the
    // right, newest on the left).
    const ordered = [...events].reverse();
    return (
      <div className="overflow-x-auto pb-1">
        <ol className="flex items-start min-w-min">
          {ordered.map((e, i) => (
            <li
              key={e.id}
              className="relative flex w-36 shrink-0 flex-col items-center text-center"
            >
              {/* connector to the next (left, in RTL) node */}
              {i < ordered.length - 1 && (
                <span
                  className="absolute top-4 start-1/2 h-px w-full bg-line"
                  aria-hidden
                />
              )}
              <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-4 ring-surface">
                <FontAwesomeIcon icon={KIND_ICON[e.kind]} className="text-sm" />
              </span>
              <p className="mt-2 line-clamp-2 px-1 text-xs font-semibold leading-snug text-ink-900">
                {e.title}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-400 ltr-nums">
                {formatDateTime(e.at)}
              </p>
            </li>
          ))}
        </ol>
      </div>
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
