import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faRobot } from "@fortawesome/free-solid-svg-icons";
import type { Lead, LeadForm } from "@/lib/domain/types";
import type { PackItem } from "./AppraiserPackModal";
import { Card } from "@/components/ui/Card";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { VerdictBanner } from "./VerdictBanner";
import { FlagChips } from "./FlagChip";
import { SourceMemoryBanner } from "./SourceMemoryBanner";
import { MissingChecklist } from "./MissingChecklist";
import { ActionBar } from "./ActionBar";
import { DealTypeChip } from "./LeadBadges";
import { cn } from "@/lib/cn";

/**
 * The hero of the whole product. Same component drives the Today cockpit
 * (compact) and the top of the lead-detail right column (full). Verdict color →
 * flags → summary → (full only) checklist → the four action buttons.
 */
export function DecisionCard({
  lead,
  form,
  packItems,
  variant = "full",
}: {
  lead: Lead;
  form: LeadForm | null;
  packItems: PackItem[];
  variant?: "full" | "compact";
}) {
  const compact = variant === "compact";

  return (
    <Card className={cn("overflow-hidden", compact && "p-0")}>
      <div className={cn("p-4 sm:p-5 space-y-4")}>
        {/* Compact header: title links to detail; full header lives on the page */}
        {compact && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/leads/${lead.id}`}
                className="text-lg font-bold text-ink-900 hover:text-brand-700 transition-colors line-clamp-1"
              >
                {lead.projectName}
              </Link>
              <div className="flex items-center gap-2 mt-1 text-sm text-ink-500">
                {lead.city && (
                  <span className="inline-flex items-center gap-1">
                    <FontAwesomeIcon icon={faLocationDot} className="text-[0.85em]" />
                    {lead.city}
                  </span>
                )}
                <DealTypeChip dealType={lead.dealType} size="sm" />
              </div>
            </div>
            <CountdownChip deadlineIso={lead.submissionDeadline} />
          </div>
        )}

        <VerdictBanner grade={lead.grade} compact={compact} />

        <SourceMemoryBanner flags={lead.flags} />

        {lead.flags.length > 0 && <FlagChips flags={lead.flags} />}

        {lead.aiSummary && (
          <div className="rounded-lg bg-brand-50/60 border border-brand-100 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 mb-1">
              <FontAwesomeIcon icon={faRobot} />
              סיכום אוטומטי
            </p>
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">
              {lead.aiSummary}
            </p>
          </div>
        )}

        {!compact && form && <MissingChecklist form={form} />}

        <div className={cn(!compact && "pt-1")}>
          <ActionBar leadId={lead.id} packItems={packItems} compact={compact} />
        </div>
      </div>
    </Card>
  );
}
