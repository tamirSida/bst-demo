import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import type { Lead, LeadForm } from "@/lib/domain/types";
import type { PackItem } from "./AppraiserPackModal";
import { Card } from "@/components/ui/Card";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { VerdictBanner } from "./VerdictBanner";
import { FlagChips } from "./FlagChip";
import { SourceMemoryBanner } from "./SourceMemoryBanner";
import { MissingChecklist } from "./MissingChecklist";
import { ActionBar } from "./ActionBar";
import { LeadStatus } from "@/lib/domain/enums";
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
  showActions = true,
}: {
  lead: Lead;
  form: LeadForm | null;
  packItems: PackItem[];
  variant?: "full" | "compact";
  /** When false, the action buttons are rendered elsewhere (e.g. the detail
   * sidebar) so this card stays a pure decision panel. */
  showActions?: boolean;
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
                className="text-lg font-medium text-ink-900 hover:text-brand-700 transition-colors line-clamp-1"
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

        <VerdictBanner lead={lead} compact={compact} />

        <SourceMemoryBanner flags={lead.flags} />

        {lead.flags.length > 0 && <FlagChips flags={lead.flags} />}

        {/* Summary sits on a hairline, not in a tinted box — a panel inside a
            panel inside a card is three frames around one paragraph. */}
        {lead.aiSummary && (
          <div className="border-t border-line pt-4">
            <p className="t-eyebrow mb-1.5">סיכום אוטומטי</p>
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">
              {lead.aiSummary}
            </p>
          </div>
        )}

        {!compact && form && <MissingChecklist form={form} />}

        {showActions && (
          <div className={cn(!compact && "pt-1")}>
            <ActionBar
              leadId={lead.id}
              leadName={lead.projectName}
              packItems={packItems}
              compact={compact}
              closed={lead.status === LeadStatus.Closed}
              contactEmail={lead.contact?.email ?? null}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
