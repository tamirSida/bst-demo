import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faFaceFrown } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/Logo";
import { getFormByToken } from "@/lib/firebase/repo";
import type { Lead } from "@/lib/domain/types";
import { DEAL_TYPE_LABEL, PLAN_STATUS_LABEL } from "@/lib/domain/enums";
import { formatNumber } from "@/lib/format/num";
import { PublicForm } from "./PublicForm";

export const dynamic = "force-dynamic";

/** Known facts we ask the lawyer to confirm (only non-empty ones). */
function knownFacts(lead: Lead): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value != null && value !== "") rows.push({ label, value });
  };
  push("סוג עסקה", DEAL_TYPE_LABEL[lead.dealType]);
  push("עיר", lead.city);
  push("כתובת", lead.address);
  if (lead.gushHelka.length) push("גוש/חלקה", lead.gushHelka.join(", "));
  push('יח"ד קיימות', lead.unitsExisting != null ? formatNumber(lead.unitsExisting) : null);
  push(
    "סטטוס תכנוני",
    lead.planStatus !== "unknown" ? PLAN_STATUS_LABEL[lead.planStatus] : null,
  );
  push('מספר תב"ע', lead.planNumber);
  return rows;
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const found = await getFormByToken(token);

  if (!found) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <span className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-surface-muted text-ink-400 mb-5">
            <FontAwesomeIcon icon={faFaceFrown} className="text-3xl" />
          </span>
          <h1 className="text-2xl font-light text-ink-900">הטופס לא נמצא</h1>
          <p className="text-ink-500 mt-2 leading-relaxed">
            ייתכן שהקישור פג תוקף. אנא פנו לשולח.
          </p>
        </div>
      </div>
    );
  }

  const { form, lead } = found;
  const facts = knownFacts(lead);
  const source = `הפרטים חולצו מהפנייה שקיבלנו${lead.contact?.name ? ` מ${lead.contact.name}` : ""}`;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Branded dark-olive bar with the cream logo and a sparse line-art motif. */}
      <header className="relative overflow-hidden bg-brand-600 text-logo-cream">
        <svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          fill="none"
          className="pointer-events-none absolute -top-10 left-0 h-48 w-48 text-logo-cream/10"
        >
          <circle cx="0" cy="100" r="70" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="100" r="120" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="100" r="170" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="relative max-w-xl mx-auto px-5 pt-8 pb-7 flex items-center gap-4">
          <Logo className="h-8 text-logo-cream shrink-0" />
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium tracking-wide text-logo-cream/60">
              פיתוח עסקי
            </p>
            <h1 className="text-[1.35rem] font-light leading-snug text-logo-cream mt-1">
              {form.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-8 space-y-6">
        {/* Known facts for confirmation */}
        {facts.length > 0 && (
          <section className="rounded-xl bg-surface border border-line shadow-card overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3.5 border-b border-line">
              <FontAwesomeIcon icon={faCircleInfo} className="text-brand-500 text-sm" />
              <h2 className="text-sm font-medium tracking-wide text-ink-700">מה שכבר ידוע לנו</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-5">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[0.7rem] tracking-wide text-ink-400">{f.label}</dt>
                  <dd className="text-sm font-medium text-ink-900 mt-0.5">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-4 -mt-1 text-xs text-ink-400">{source}</p>
          </section>
        )}

        {/* The form */}
        <section className="rounded-xl bg-surface border border-line shadow-card p-5 sm:p-6">
          <PublicForm form={form} token={token} />
        </section>

        <p className="text-center text-xs text-ink-400 pb-6 leading-relaxed">
          המידע נשמר באופן מאובטח ומשמש את צוות הפיתוח העסקי של BST בלבד.
        </p>
      </main>
    </div>
  );
}
