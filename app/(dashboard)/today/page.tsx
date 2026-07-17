import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faClock,
  faInbox,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import {
  getForm,
  listDocuments,
  listLeads,
  listOutbound,
} from "@/lib/firebase/repo";
import { businessDaysUntil } from "@/lib/domain/compute";
import { LeadStatus } from "@/lib/domain/enums";
import type { Lead } from "@/lib/domain/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { Badge } from "@/components/ui/Badge";
import { DecisionCard } from "@/components/leads/DecisionCard";
import { NewLeadButton } from "@/components/leads/NewLeadButton";
import { InboundStatus } from "@/components/leads/InboundStatus";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { appraiserPack } from "@/lib/leads/pack";

export const dynamic = "force-dynamic";

const NEEDS_DECISION: string[] = [
  LeadStatus.New,
  LeadStatus.Triage,
  LeadStatus.AwaitingInfo,
];

export default async function TodayPage() {
  const leads = await listLeads({ activeOnly: true });

  // Leads awaiting a GO/NO-GO decision.
  const inbox = leads.filter((l) => NEEDS_DECISION.includes(l.status));

  // Load form + documents for each inbox lead (for pack + checklist).
  const inboxCards = await Promise.all(
    inbox.map(async (lead) => {
      const [form, documents] = await Promise.all([
        getForm(lead.id),
        listDocuments(lead.id),
      ]);
      return { lead, form, packItems: appraiserPack(lead, documents, form) };
    }),
  );

  // Upcoming deadlines (active) within ~14 business days, ascending.
  const upcoming = leads
    .filter((l) => {
      const d = businessDaysUntil(l.submissionDeadline);
      return d != null && d >= 0 && d <= 14;
    })
    .sort(
      (a, b) =>
        (businessDaysUntil(a.submissionDeadline) ?? 0) -
        (businessDaysUntil(b.submissionDeadline) ?? 0),
    );

  // Automated outbound emails sent today.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const outboundToday = await listOutbound(startOfToday.toISOString());

  return (
    <div className="space-y-6">
      <PageHeader
        title="היום"
        subtitle="מה דורש החלטה עכשיו"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AutoRefresh />
            <NewLeadButton />
          </div>
        }
      />

      <InboundStatus />

      {/* New leads needing a decision */}
      <section>
        <div className="flex items-center gap-2.5 mb-3">
          <FontAwesomeIcon icon={faInbox} className="text-ink-400 text-lg" />
          <h2 className="text-xl font-light text-ink-900">לידים חדשים</h2>
          <Badge tone="neutral" size="sm">
            <span className="ltr-nums">{inboxCards.length}</span>
          </Badge>
        </div>
        {inboxCards.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {inboxCards.map(({ lead, form, packItems }) => (
              <DecisionCard
                key={lead.id}
                lead={lead}
                form={form}
                packItems={packItems}
                variant="compact"
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={faCircleCheck}
              title="אין משימות פתוחות"
              hint="כל הלידים החדשים טופלו. עבודה יפה."
            />
          </Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming deadlines */}
        <Card>
          <CardHeader title="מועדי הגשה קרובים" icon={faClock} count={upcoming.length} />
          {upcoming.length ? (
            <ul className="px-3 pb-3">
              {upcoming.map((lead) => (
                <DeadlineRow key={lead.id} lead={lead} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={faClock} title="אין מועדי הגשה קרובים" compact />
          )}
        </Card>

        {/* Automated outbound today */}
        <Card>
          <CardHeader
            title="נשלחו היום אוטומטית"
            icon={faPaperPlane}
            count={outboundToday.length}
          />
          {outboundToday.length ? (
            <ul className="px-5 pb-4 space-y-3">
              {outboundToday.map((mail) => (
                <li key={mail.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{mail.subject}</p>
                    <p className="text-xs text-ink-400 truncate" dir="ltr">
                      {mail.to}
                    </p>
                  </div>
                  <Badge tone={mail.status === "sent" ? "go" : "neutral"} size="sm">
                    {mail.status === "sent" ? "נשלח" : "סומלץ"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={faPaperPlane} title="לא נשלחו מיילים היום" compact />
          )}
        </Card>
      </div>
    </div>
  );
}

/** A single upcoming-deadline row. */
function DeadlineRow({ lead }: { lead: Lead }) {
  return (
    <li>
      <Link
        href={`/leads/${lead.id}`}
        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-muted transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900 truncate">{lead.projectName}</p>
          {lead.city && <p className="text-xs text-ink-400">{lead.city}</p>}
        </div>
        <CountdownChip deadlineIso={lead.submissionDeadline} />
      </Link>
    </li>
  );
}
