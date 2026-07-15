"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleInfo,
  faSkull,
  faTriangleExclamation,
  faCircleExclamation,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { Flag } from "@/lib/domain/types";
import { FLAG_SEVERITY_LABEL, type FlagSeverity } from "@/lib/domain/enums";
import { Popover } from "@/components/ui/Popover";
import { TONE_SOFT, TONE_TEXT, flagTone } from "@/lib/status";
import { cn } from "@/lib/cn";
import { FLAG_SORT } from "@/lib/status";

const SEVERITY_ICON: Record<FlagSeverity, IconDefinition> = {
  kill: faSkull,
  red: faCircleExclamation,
  yellow: faTriangleExclamation,
  green: faCircleCheck,
  info: faCircleInfo,
};

/** Sort a flag list kill→red→yellow→green→info (stable). */
export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => FLAG_SORT[a.severity] - FLAG_SORT[b.severity]);
}

/**
 * A clickable flag chip. Tap opens a popover with the rule (threshold), the
 * detail (values), and — when present — the suggested cure. Color = severity.
 */
export function FlagChip({ flag }: { flag: Flag }) {
  const tone = flagTone(flag.severity);
  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold whitespace-nowrap",
            "transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
            TONE_SOFT[tone],
          )}
        >
          <FontAwesomeIcon icon={SEVERITY_ICON[flag.severity]} className="text-[0.85em]" />
          {flag.title}
        </button>
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={SEVERITY_ICON[flag.severity]}
            className={cn("text-base", TONE_TEXT[tone])}
          />
          <span className="font-bold text-ink-900">{flag.title}</span>
          <span
            className={cn(
              "me-auto inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
              TONE_SOFT[tone],
            )}
          >
            {FLAG_SEVERITY_LABEL[flag.severity]}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-400 mb-0.5">הכלל</p>
          <p className="text-sm text-ink-700 leading-relaxed">{flag.rule}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-400 mb-0.5">הסבר</p>
          <p className="text-sm text-ink-700 leading-relaxed">{flag.detail}</p>
        </div>

        {flag.cure && (
          <div className="rounded-md bg-warn-50 border border-warn-100 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-warn-700 mb-0.5">
              <FontAwesomeIcon icon={faLightbulb} />
              מה אפשר לעשות
            </p>
            <p className="text-sm text-warn-700 leading-relaxed">{flag.cure}</p>
          </div>
        )}
      </div>
    </Popover>
  );
}

/** A row of flag chips, always pre-sorted by severity. */
export function FlagChips({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sortFlags(flags).map((f) => (
        <FlagChip key={f.id} flag={f} />
      ))}
    </div>
  );
}
