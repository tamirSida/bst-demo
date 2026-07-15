import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import type { Flag } from "@/lib/domain/types";

/**
 * "We've seen this site before" — the archive flywheel surfaced inline. Rendered
 * whenever a duplicate_lead flag is present. Frames prior history as institutional
 * memory rather than an error.
 */
export function SourceMemoryBanner({ flags }: { flags: Flag[] }) {
  const dup = flags.find((f) => f.id === "duplicate_lead");
  if (!dup) return null;
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 flex items-start gap-3">
      <FontAwesomeIcon icon={faClockRotateLeft} className="text-brand-600 text-lg mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold text-brand-800 text-sm">כבר נתקלנו במתחם הזה</p>
        <p className="text-brand-700 text-sm leading-relaxed mt-0.5">{dup.detail}</p>
      </div>
    </div>
  );
}
