import type { Lead } from "@/lib/domain/types";
import {
  DEAL_TYPE_LABEL,
  LEAD_STATUS_LABEL,
  VERDICT_LABEL,
  LeadStatus,
} from "@/lib/domain/enums";
import { businessDaysUntil } from "@/lib/domain/compute";
import { verdictTone, type Tone } from "@/lib/status";
import { formatDate, formatNumber } from "@/lib/format/num";
import type { LeadTableRow } from "@/components/leads/LeadTable";
import type { CsvRow } from "@/components/leads/ExportCsvButton";

const STATUS_TONE: Record<string, Tone> = {
  [LeadStatus.New]: "brand",
  [LeadStatus.Triage]: "brand",
  [LeadStatus.AwaitingInfo]: "warn",
  [LeadStatus.PlanningCheck]: "brand",
  [LeadStatus.Questionnaire]: "brand",
  [LeadStatus.EconomicCheck]: "brand",
  [LeadStatus.OfferSubmitted]: "go",
  [LeadStatus.Closed]: "neutral",
};

/** Deadline tone mirroring CountdownChip: red<3 · amber<7 · overdue=red. */
function deadlineTone(iso: string | null): Tone | null {
  const days = businessDaysUntil(iso);
  if (days == null) return null;
  if (days < 3) return "stop";
  if (days < 7) return "warn";
  return "neutral";
}

const hasAlarm = (lead: Lead) =>
  lead.flags.some((f) => f.severity === "red" || f.severity === "kill");

const dash = "—";

/** Serialize a lead into a table row (no domain logic leaks to the client). */
export function toTableRow(lead: Lead): LeadTableRow {
  return {
    id: lead.id,
    projectName: lead.projectName,
    city: lead.city ?? dash,
    dealType: DEAL_TYPE_LABEL[lead.dealType],
    status: LEAD_STATUS_LABEL[lead.status],
    statusTone: STATUS_TONE[lead.status] ?? "neutral",
    unitsExisting: lead.unitsExisting != null ? formatNumber(lead.unitsExisting) : dash,
    unitsPlanned: lead.unitsPlanned != null ? formatNumber(lead.unitsPlanned) : dash,
    deadline: lead.submissionDeadline ? formatDate(lead.submissionDeadline) : dash,
    deadlineTone: deadlineTone(lead.submissionDeadline),
    verdict: lead.grade ? VERDICT_LABEL[lead.grade.verdict] : null,
    verdictTone: lead.grade ? verdictTone(lead.grade.verdict) : null,
    verdictKey: lead.grade?.verdict ?? null,
    score: lead.grade?.score ?? null,
    alarm: hasAlarm(lead),
  };
}

/** Serialize a lead into a plain CSV row (Hebrew values, no tones). */
export function toCsvRow(lead: Lead): CsvRow {
  return {
    projectName: lead.projectName,
    city: lead.city ?? "",
    dealType: DEAL_TYPE_LABEL[lead.dealType],
    status: LEAD_STATUS_LABEL[lead.status],
    unitsExisting: lead.unitsExisting != null ? String(lead.unitsExisting) : "",
    unitsPlanned: lead.unitsPlanned != null ? String(lead.unitsPlanned) : "",
    deadline: lead.submissionDeadline ? formatDate(lead.submissionDeadline) : "",
    score: lead.grade?.score != null ? String(lead.grade.score) : "",
    verdict: lead.grade ? VERDICT_LABEL[lead.grade.verdict] : "",
  };
}
