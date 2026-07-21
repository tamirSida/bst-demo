import { notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxArchive,
  faBolt,
  faChevronRight,
  faClockRotateLeft,
  faLocationDot,
  faMapLocationDot,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import { LeadStatus, REJECTION_REASON_LABEL } from "@/lib/domain/enums";
import {
  getConfig,
  getForm,
  getLead,
  listDocuments,
  listTimeline,
} from "@/lib/firebase/repo";
import { density } from "@/lib/domain/compute";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { DecisionCard } from "@/components/leads/DecisionCard";
import { FactSheet } from "@/components/leads/FactSheet";
import { Timeline } from "@/components/leads/Timeline";
import { QuestionnaireTracker } from "@/components/leads/QuestionnaireTracker";
import { DocumentList } from "@/components/leads/DocumentList";
import { ActionBar } from "@/components/leads/ActionBar";
import { LeadMap } from "@/components/leads/LeadMap";
import { DealTypeChip, StatusChip } from "@/components/leads/LeadBadges";
import { YazamQuestionnaire } from "@/components/leads/YazamQuestionnaire";
import { appraiserPack } from "@/lib/leads/pack";
import { geocodeLead } from "@/lib/leads/geo";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [form, documents, events, geo, config] = await Promise.all([
    getForm(id),
    listDocuments(id),
    listTimeline(id),
    geocodeLead(lead),
    getConfig(),
  ]);
  const packItems = appraiserPack(lead, documents, form);
  const isClosed = lead.status === LeadStatus.Closed;

  // שאלון יזם: shown when the density gate opens it, or once it's been filled.
  const dens = density(lead);
  const yazamState = lead.extra?.yazam as
    | { answers?: Record<string, string> }
    | undefined;
  const hasYazam = Boolean(
    yazamState?.answers && Object.keys(yazamState.answers).length > 0,
  );
  const yazamGated = dens != null && dens >= config.yazamGateDensity;
  const showYazam = yazamGated || hasYazam;

  return (
    <div className="space-y-5">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-700"
      >
        <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
        חזרה לרשימת הלידים
      </Link>

      <PageHeader title={lead.projectName} />

      {/* Header meta row — the deadline chip lives here, attached to the title */}
      <div className="flex flex-wrap items-center gap-2.5 -mt-2">
        {lead.city && (
          <span className="inline-flex items-center gap-1.5 text-ink-500 text-sm">
            <FontAwesomeIcon icon={faLocationDot} className="text-ink-400" />
            {lead.city}
            {lead.address && <span className="text-ink-400">· {lead.address}</span>}
          </span>
        )}
        <DealTypeChip dealType={lead.dealType} />
        <StatusChip status={lead.status} />
        <CountdownChip deadlineIso={lead.submissionDeadline} />
      </div>

      {/* Archived banner — a closed lead must not look like a live one */}
      {lead.status === LeadStatus.Closed && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted border border-line px-4 py-3 text-sm text-ink-700">
          <FontAwesomeIcon icon={faBoxArchive} className="text-ink-400" />
          <span className="font-semibold">הליד נמצא בארכיון</span>
          {lead.rejectionReason && (
            <span className="text-ink-500">
              — סיבת הסגירה: {REJECTION_REASON_LABEL[lead.rejectionReason]}
            </span>
          )}
          <span className="text-ink-400">ניתן להחזירו לטיפול מכפתור השחזור בכרטיס ההחלטה.</span>
        </div>
      )}

      {/* Full-width activity timeline across the top, everything else beneath it */}
      <Card>
        <CardHeader title="פעילות" icon={faClockRotateLeft} />
        <div className="px-5 pb-5">
          <Timeline events={events} layout="horizontal" />
        </div>
      </Card>

      {/* Two-column layout (matches the design mock):
          main (right in RTL) = decision + completion form;
          sidebar (left) = action buttons → map → lead facts. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Main column (first in RTL) — the decision hero + form + documents */}
        <div className="space-y-5">
          <DecisionCard
            lead={lead}
            form={form}
            packItems={packItems}
            variant="full"
            showActions={false}
          />

          {form && (
            <Card className="p-4 sm:p-5">
              <QuestionnaireTracker form={form} />
            </Card>
          )}

          {showYazam && (
            <YazamQuestionnaire
              leadId={lead.id}
              density={dens}
              gateDensity={config.yazamGateDensity}
              companyDefaults={config.yazamAnswers ?? {}}
              initialAnswers={yazamState?.answers ?? {}}
            />
          )}

          <Card>
            <CardHeader title="מסמכים" icon={faPaperclip} count={documents.length} />
            <DocumentList documents={documents} />
          </Card>
        </div>

        {/* Sidebar (left in RTL) — actions on top, then the plot map, then facts */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="פעולות" icon={faBolt} />
            <div className="px-5 pb-5">
              <ActionBar
                leadId={lead.id}
                leadName={lead.projectName}
                packItems={packItems}
                closed={isClosed}
                contactEmail={lead.contact?.email ?? null}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="מפת המגרש" icon={faMapLocationDot} />
            <div className="px-5 pb-5">
              <LeadMap
                leadId={lead.id}
                lat={geo.lat}
                lng={geo.lng}
                label={lead.projectName}
                address={
                  [lead.address, lead.city].filter(Boolean).join(", ") || null
                }
                approximate={geo.approximate}
                gushHelka={lead.gushHelka}
              />
            </div>
          </Card>

          <FactSheet lead={lead} />
        </div>
      </div>
    </div>
  );
}
