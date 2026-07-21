import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { requireAuth } from "@/lib/auth/session";
import { getLead } from "@/lib/firebase/repo";
import { buildMockTabu } from "@/lib/leads/mockTabu";
import { PrintButton } from "@/components/leads/PrintButton";

export const dynamic = "force-dynamic";

export default async function TabuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const tabu = buildMockTabu(lead);

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-6 print:bg-white print:p-0">
      {/* Toolbar — not part of the printout */}
      <div className="print:hidden mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <Link
          href={`/leads/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-700"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          חזרה לליד
        </Link>
        <PrintButton />
      </div>

      {/* The document */}
      <article className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-8 shadow-card print:border-0 print:shadow-none">
        {/* Demo disclaimer — always visible, including in print */}
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warn-300 bg-warn-50 px-4 py-3 text-sm text-warn-800">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          <span>
            <span className="font-semibold">מסמך הדגמה</span> · נתונים לדוגמה בלבד ·
            אינו נסח רישום רשמי מטעם לשכת רישום המקרקעין.
          </span>
        </div>

        <header className="border-b border-line pb-4 text-center">
          <h1 className="text-2xl font-bold text-ink-900">נסח רישום מקרקעין</h1>
          <p className="mt-1 text-sm text-ink-500">
            לשכת רישום המקרקעין · נסח מלא (הדגמה)
          </p>
          <div className="mt-3 flex justify-center gap-6 text-xs text-ink-500">
            <span>
              מספר נסח: <span className="ltr-nums font-semibold text-ink-700">{tabu.extractNumber}</span>
            </span>
            <span>
              תאריך הפקה: <span className="ltr-nums font-semibold text-ink-700">{tabu.issuedAt}</span>
            </span>
          </div>
        </header>

        <Section title="פרטי המקרקעין">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="גוש" value={tabu.gush} ltr />
            <Row label="חלקה" value={tabu.helka} ltr />
            <Row
              label='שטח רשום (מ"ר)'
              value={tabu.areaSqm != null ? tabu.areaSqm.toLocaleString("en-US") : "—"}
              ltr
            />
            <Row label="יישוב" value={tabu.city} />
            <Row label="כתובת" value={tabu.address} className="col-span-2" />
            {tabu.parcels.length > 0 && (
              <Row label="חלקות" value={tabu.parcels.join(" · ")} className="col-span-2" />
            )}
          </dl>
        </Section>

        <Section title="בעלויות">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-500">
                <th className="py-2 text-start font-semibold">שם הבעלים</th>
                <th className="py-2 text-start font-semibold">מספר זהות</th>
                <th className="py-2 text-start font-semibold">מהות הזכות</th>
                <th className="py-2 text-start font-semibold">חלק בנכס</th>
              </tr>
            </thead>
            <tbody>
              {tabu.owners.map((o, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-2 font-medium text-ink-900">{o.name}</td>
                  <td className="py-2 text-ink-600">{o.idMasked}</td>
                  <td className="py-2 text-ink-600">{o.right}</td>
                  <td className="py-2 text-ink-700 ltr-nums">{o.share}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="משכנתאות ושעבודים">
          {tabu.liens.length === 0 ? (
            <p className="text-sm text-ink-500">לא נרשמו משכנתאות או שעבודים.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-500">
                  <th className="py-2 text-start font-semibold">לטובת</th>
                  <th className="py-2 text-start font-semibold">סכום</th>
                  <th className="py-2 text-start font-semibold">תאריך רישום</th>
                </tr>
              </thead>
              <tbody>
                {tabu.liens.map((l, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2 font-medium text-ink-900">{l.holder}</td>
                    <td className="py-2 text-ink-700 ltr-nums">{l.amount}</td>
                    <td className="py-2 text-ink-600 ltr-nums">{l.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="הערות">
          <ul className="list-disc space-y-1 pe-5 text-sm text-ink-700">
            {tabu.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Section>

        <footer className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-400">
          מסמך זה הופק לצורכי הדגמה במערכת BST בלבד ואינו מהווה נסח רישום רשמי.
        </footer>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-bold text-brand-700">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  ltr,
  className,
}: {
  label: string;
  value: string | null;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="inline text-ink-500">{label}: </dt>
      <dd className={`inline font-medium text-ink-900 ${ltr ? "ltr-nums" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
