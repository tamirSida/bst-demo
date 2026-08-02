import { getConfig, listLeads } from "@/lib/firebase/repo";
import { PageHero } from "@/components/ui/PageHero";
import { todayLabel } from "@/lib/dates";
import { PipelineFilters } from "@/components/leads/PipelineFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { ExportCsvButton } from "@/components/leads/ExportCsvButton";
import { InboundStatus } from "@/components/leads/InboundStatus";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { toCsvRow, toTableRow } from "@/lib/leads/rows";
import { LEAD_STATUS_LABEL, LeadStatus } from "@/lib/domain/enums";

/** Statuses that still need a human decision — matched on the display label,
 *  which is what the serialized row carries. */
const PENDING_STATUS = new Set([
  LEAD_STATUS_LABEL[LeadStatus.New],
  LEAD_STATUS_LABEL[LeadStatus.Triage],
  LEAD_STATUS_LABEL[LeadStatus.AwaitingInfo],
]);

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const config = await getConfig();
  const uploadedOnly = !config.showSeedData;

  const activeOnly = one(sp.active) !== "0"; // default ON
  const filter = {
    activeOnly,
    uploadedOnly,
    dealType: one(sp.dealType),
    city: one(sp.city),
    search: one(sp.search),
  };

  const leads = await listLeads(filter);
  const rows = leads.map(toTableRow);
  const csvRows = leads.map(toCsvRow);

  // City options come from the full active book (stable regardless of filter).
  const allActive = await listLeads({ activeOnly: true, uploadedOnly });
  const cities = [...new Set(allActive.map((l) => l.city).filter(Boolean))].sort() as string[];

  // The job, not the record count: how many of the leads on screen are still
  // waiting on a person, versus how many have already been ruled on.
  const undecided = rows.filter((r) => PENDING_STATUS.has(r.status)).length;

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={todayLabel()}
        title="לידים"
        subtitle="כל הלידים במבט אחד — תחליף לאקסל"
        progress={{
          remaining: undecided,
          total: rows.length,
          remainingLabel: "ממתינים להכרעה",
          doneLabel: "הוכרעו",
        }}
        stats={[
          { label: "לידים בתצוגה", value: <span className="ltr-nums">{rows.length}</span> },
          { label: "ערים", value: <span className="ltr-nums">{cities.length}</span> },
        ]}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AutoRefresh />
            <ExportCsvButton rows={csvRows} />
          </div>
        }
      />

      <InboundStatus />

      {/* No cards. A filter panel in a white box above a table in another white
          box is the silhouette of every generated CRUD screen. The controls are
          a toolbar on the page ground, the data sits directly on the paper, and
          hairlines do the separating that borders were doing. */}
      <div className="rise rise-1 border-y border-line py-3">
        <PipelineFilters cities={cities} />
      </div>

      <div className="rise rise-2">
        <LeadTable rows={rows} />
      </div>
    </div>
  );
}
