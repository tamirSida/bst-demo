import { Badge } from "@/components/ui/Badge";
import {
  DEAL_TYPE_LABEL,
  LEAD_STATUS_LABEL,
  VERDICT_LABEL,
  LeadStatus,
  type DealType,
  type LeadStatus as LeadStatusT,
  type Verdict,
} from "@/lib/domain/enums";
import { verdictTone, type Tone } from "@/lib/status";

/** Neutral chip naming the deal type (פינוי בינוי / תמ"א …). */
export function DealTypeChip({ dealType, size }: { dealType: DealType; size?: "sm" | "md" }) {
  return (
    <Badge tone="brand" size={size}>
      {DEAL_TYPE_LABEL[dealType]}
    </Badge>
  );
}

const STATUS_TONE: Record<LeadStatusT, Tone> = {
  [LeadStatus.New]: "brand",
  [LeadStatus.Triage]: "brand",
  [LeadStatus.AwaitingInfo]: "warn",
  [LeadStatus.PlanningCheck]: "brand",
  [LeadStatus.Questionnaire]: "brand",
  [LeadStatus.EconomicCheck]: "brand",
  [LeadStatus.OfferSubmitted]: "go",
  [LeadStatus.Closed]: "neutral",
};

/** Chip for the pipeline status. */
export function StatusChip({ status, size }: { status: LeadStatusT; size?: "sm" | "md" }) {
  return (
    <Badge tone={STATUS_TONE[status]} size={size}>
      {LEAD_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Small verdict recommendation chip (traffic-light tinted). */
export function VerdictChip({ verdict, size }: { verdict: Verdict; size?: "sm" | "md" }) {
  return (
    <Badge tone={verdictTone(verdict)} size={size}>
      {VERDICT_LABEL[verdict]}
    </Badge>
  );
}
