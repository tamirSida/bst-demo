import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleInfo,
  faFaceFrown,
  faTowerObservation,
} from "@fortawesome/free-solid-svg-icons";
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
        <div className="text-center">
          <span className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-surface-muted text-ink-400 mb-4">
            <FontAwesomeIcon icon={faFaceFrown} className="text-3xl" />
          </span>
          <h1 className="text-xl font-bold text-ink-900">הטופס לא נמצא</h1>
          <p className="text-ink-500 mt-1">ייתכן שהקישור פג תוקף. אנא פנו לשולח.</p>
        </div>
      </div>
    );
  }

  const { form, lead } = found;
  const facts = knownFacts(lead);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Branded header */}
      <header className="bg-brand-600 text-white">
        <div className="max-w-xl mx-auto px-5 py-6 flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-white/15">
            <FontAwesomeIcon icon={faTowerObservation} className="text-xl" />
          </span>
          <div>
            <p className="text-xs text-brand-100 font-semibold">מגדלור · BST</p>
            <h1 className="text-lg font-extrabold leading-tight">{form.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-6 space-y-5">
        {/* Known facts for confirmation */}
        {facts.length > 0 && (
          <section className="rounded-xl bg-surface border border-line shadow-card p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-700 mb-3">
              <FontAwesomeIcon icon={faCircleInfo} className="text-brand-600" />
              מה שכבר ידוע לנו
              <span className="ms-auto text-xs font-normal text-ink-400">
                הפרטים חולצו מהפנייה שקיבלנו{lead.contact?.name ? ` מ${lead.contact.name}` : ""}
              </span>
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs text-ink-400">{f.label}</dt>
                  <dd className="text-sm font-semibold text-ink-900">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* The form */}
        <section className="rounded-xl bg-surface border border-line shadow-card p-5">
          <PublicForm form={form} token={token} />
        </section>

        <p className="text-center text-xs text-ink-400 pb-6">
          המידע נשמר באופן מאובטח ומשמש את צוות הפיתוח העסקי של BST בלבד.
        </p>
      </main>
    </div>
  );
}
