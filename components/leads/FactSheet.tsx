import type { Lead } from "@/lib/domain/types";
import { density, multiplier, round } from "@/lib/domain/compute";
import {
  PLAN_STATUS_LABEL,
  PlanStatus,
  FEE_STRUCTURE_LABEL,
} from "@/lib/domain/enums";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { FactRow } from "./FactRow";
import { ContactCard } from "./ContactCard";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/format/num";
import { faTableList } from "@fortawesome/free-solid-svg-icons";

/** Render a value as an LTR-wrapped numeric span (or the em-dash fallback). */
function num(v: number | null, digits?: number) {
  if (v == null) return <span className="text-ink-400">—</span>;
  return <span className="ltr-nums">{formatNumber(digits != null ? round(v, digits) : v)}</span>;
}

/**
 * The editable fact list. AI-derived values carry a provenance source icon;
 * pencils open inline editors (updateFact → re-grade). density/multiplier are
 * computed and read-only.
 */
export function FactSheet({ lead }: { lead: Lead }) {
  const d = density(lead);
  const m = multiplier(lead);
  const prov = lead.provenance;

  return (
    <Card>
      <CardHeader title="נתוני הליד" icon={faTableList} />
      <div className="px-5 pb-3">
        <FactRow
          leadId={lead.id}
          field="city"
          label="עיר"
          value={lead.city ?? <span className="text-ink-400">—</span>}
          provenance={prov.city}
          edit={{ raw: lead.city ?? "", type: "text", coerce: "string" }}
        />
        <FactRow
          leadId={lead.id}
          field="address"
          label="כתובת"
          value={lead.address ?? <span className="text-ink-400">—</span>}
          provenance={prov.address}
          edit={{ raw: lead.address ?? "", type: "text", coerce: "string" }}
        />
        <FactRow
          leadId={lead.id}
          field="gushHelka"
          label="גוש/חלקה"
          value={
            lead.gushHelka.length ? (
              <span className="ltr-nums">{lead.gushHelka.join(", ")}</span>
            ) : (
              <span className="text-ink-400">—</span>
            )
          }
          provenance={prov.gushHelka}
        />
        <FactRow
          leadId={lead.id}
          field="unitsExisting"
          label='יח"ד קיימות'
          value={num(lead.unitsExisting)}
          provenance={prov.unitsExisting}
          edit={{ raw: String(lead.unitsExisting ?? ""), type: "number", coerce: "number" }}
        />
        <FactRow
          leadId={lead.id}
          field="unitsPlanned"
          label='יח"ד יוצאות'
          value={num(lead.unitsPlanned)}
          provenance={prov.unitsPlanned}
          edit={{ raw: String(lead.unitsPlanned ?? ""), type: "number", coerce: "number" }}
        />
        <FactRow
          leadId={lead.id}
          field="developerUnits"
          label="דירות יזם"
          value={num(lead.developerUnits)}
          provenance={prov.developerUnits}
          edit={{ raw: String(lead.developerUnits ?? ""), type: "number", coerce: "number" }}
        />
        <FactRow
          leadId={lead.id}
          field="lotAreaDunam"
          label="שטח (דונם)"
          value={num(lead.lotAreaDunam, 2)}
          provenance={prov.lotAreaDunam}
          edit={{ raw: String(lead.lotAreaDunam ?? ""), type: "number", coerce: "number" }}
        />
        {/* Computed, read-only */}
        <FactRow
          leadId={lead.id}
          label='צפיפות (יח"ד/דונם)'
          value={num(d, 1)}
        />
        <FactRow leadId={lead.id} label="מכפיל" value={num(m, 2)} />
        <FactRow
          leadId={lead.id}
          field="planStatus"
          label="סטטוס תכנוני"
          value={PLAN_STATUS_LABEL[lead.planStatus]}
          provenance={prov.planStatus}
          edit={{
            raw: lead.planStatus,
            type: "select",
            coerce: "string",
            options: Object.values(PlanStatus).map((s) => ({
              value: s,
              label: PLAN_STATUS_LABEL[s],
            })),
          }}
        />
        <FactRow
          leadId={lead.id}
          field="planNumber"
          label='מספר תב"ע'
          value={
            lead.planNumber ? (
              <span className="ltr-nums">{lead.planNumber}</span>
            ) : (
              <span className="text-ink-400">—</span>
            )
          }
          provenance={prov.planNumber}
          edit={{ raw: lead.planNumber ?? "", type: "text", coerce: "string" }}
        />
        <FactRow
          leadId={lead.id}
          field="signaturePct"
          label="אחוז חתימות"
          value={
            lead.signaturePct != null ? (
              <span className="ltr-nums">{formatPercent(lead.signaturePct)}</span>
            ) : (
              <span className="text-ink-400">—</span>
            )
          }
          provenance={prov.signaturePct}
          edit={{
            raw: lead.signaturePct != null ? String(Math.round(lead.signaturePct * 100)) : "",
            type: "number",
            coerce: "percent",
          }}
        />
        <FactRow
          leadId={lead.id}
          field="sourceFee"
          label="עמלת מקור"
          value={
            lead.sourceFee?.amount != null ? (
              <span>
                <span className="ltr-nums">{formatCurrency(lead.sourceFee.amount)}</span>
                <span className="text-ink-400 text-xs">
                  {" · "}
                  {FEE_STRUCTURE_LABEL[lead.sourceFee.structure]}
                </span>
              </span>
            ) : (
              <span className="text-ink-400">—</span>
            )
          }
          provenance={prov.sourceFee}
        />
        <FactRow
          leadId={lead.id}
          label="איש קשר"
          value={<ContactCard contact={lead.contact} />}
        />
      </div>
    </Card>
  );
}
