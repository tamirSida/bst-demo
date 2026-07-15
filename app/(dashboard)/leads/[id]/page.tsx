import { notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faClockRotateLeft,
  faLocationDot,
  faPaperclip,
} from "@fortawesome/free-solid-svg-icons";
import {
  getForm,
  getLead,
  listDocuments,
  listTimeline,
} from "@/lib/firebase/repo";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { DecisionCard } from "@/components/leads/DecisionCard";
import { FactSheet } from "@/components/leads/FactSheet";
import { Timeline } from "@/components/leads/Timeline";
import { QuestionnaireTracker } from "@/components/leads/QuestionnaireTracker";
import { DocumentList } from "@/components/leads/DocumentList";
import { DealTypeChip, StatusChip } from "@/components/leads/LeadBadges";
import { appraiserPack } from "@/lib/leads/pack";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [form, documents, events] = await Promise.all([
    getForm(id),
    listDocuments(id),
    listTimeline(id),
  ]);
  const packItems = appraiserPack(lead, documents, form);

  return (
    <div className="space-y-5">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-700"
      >
        <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
        חזרה לרשימת הלידים
      </Link>

      <PageHeader
        title={lead.projectName}
        action={<CountdownChip deadlineIso={lead.submissionDeadline} />}
      />

      {/* Header meta row */}
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
      </div>

      {/* Two-column layout: right = decision + facts, left = activity */}
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Right column (first in RTL) */}
        <div className="space-y-5">
          <DecisionCard lead={lead} form={form} packItems={packItems} variant="full" />
          <FactSheet lead={lead} />
        </div>

        {/* Left column: timeline + questionnaire + documents */}
        <div className="space-y-5">
          {form && (
            <Card className="p-4 sm:p-5">
              <QuestionnaireTracker form={form} />
            </Card>
          )}

          <Card>
            <CardHeader title="פעילות" icon={faClockRotateLeft} />
            <div className="px-5 pb-5">
              <Timeline events={events} />
            </div>
          </Card>

          <Card>
            <CardHeader title="מסמכים" icon={faPaperclip} count={documents.length} />
            <DocumentList documents={documents} />
          </Card>
        </div>
      </div>
    </div>
  );
}
