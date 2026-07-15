import { listLeads } from "@/lib/firebase/repo";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PipelineFilters } from "@/components/leads/PipelineFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { ExportCsvButton } from "@/components/leads/ExportCsvButton";
import { toCsvRow, toTableRow } from "@/lib/leads/rows";

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

  const activeOnly = one(sp.active) !== "0"; // default ON
  const filter = {
    activeOnly,
    dealType: one(sp.dealType),
    city: one(sp.city),
    search: one(sp.search),
  };

  const leads = await listLeads(filter);
  const rows = leads.map(toTableRow);
  const csvRows = leads.map(toCsvRow);

  // City options come from the full active book (stable regardless of filter).
  const allActive = await listLeads({ activeOnly: true });
  const cities = [...new Set(allActive.map((l) => l.city).filter(Boolean))].sort() as string[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="לידים"
        subtitle="כל הלידים במבט אחד — תחליף לאקסל"
        action={<ExportCsvButton rows={csvRows} />}
      />

      <Card className="p-4 sm:p-5">
        <PipelineFilters cities={cities} />
      </Card>

      <Card className="overflow-hidden">
        <LeadTable rows={rows} />
      </Card>
    </div>
  );
}
