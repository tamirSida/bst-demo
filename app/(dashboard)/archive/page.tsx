import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { getConfig, listLeads } from "@/lib/firebase/repo";
import { LeadStatus, REJECTION_REASON_LABEL } from "@/lib/domain/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DealTypeChip } from "@/components/leads/LeadBadges";
import { ArchiveSearch } from "@/components/leads/ArchiveSearch";
import { formatDate } from "@/lib/format/num";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const search = one(sp.search);
  const config = await getConfig();

  // Institutional memory = all inactive (closed) leads, optionally searched.
  const all = await listLeads({ search, uploadedOnly: !config.showSeedData });
  const closed = all.filter((l) => l.status === LeadStatus.Closed);

  return (
    <div className="space-y-5">
      <PageHeader
        title="ארכיון"
        subtitle="זיכרון מוסדי — כל ליד שנבדק בעבר והסיבה לדחייתו"
      />

      <ArchiveSearch />

      <Card className="overflow-hidden">
        {closed.length ? (
          <ul>
            {closed.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-line last:border-0 hover:bg-surface-muted/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900 truncate">{lead.projectName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-400">
                      {lead.city && (
                        <span className="inline-flex items-center gap-1">
                          <FontAwesomeIcon icon={faLocationDot} />
                          {lead.city}
                        </span>
                      )}
                      {lead.leadReceivedAt && (
                        <span className="ltr-nums">{formatDate(lead.leadReceivedAt)}</span>
                      )}
                    </div>
                  </div>
                  <DealTypeChip dealType={lead.dealType} size="sm" />
                  {lead.rejectionReason && (
                    <Badge tone="neutral" size="sm">
                      {REJECTION_REASON_LABEL[lead.rejectionReason]}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={faBoxArchive}
            title={search ? "לא נמצאו תוצאות" : "הארכיון ריק"}
            hint={
              search
                ? "נסו מונח חיפוש אחר."
                : "לידים שיסומנו כלא פעילים יופיעו כאן לצורך התייחסות עתידית."
            }
          />
        )}
      </Card>

      {closed.length > 0 && (
        <p className="text-center text-sm text-ink-400">
          <span className="ltr-nums">{closed.length}</span> לידים בארכיון
        </p>
      )}
    </div>
  );
}
