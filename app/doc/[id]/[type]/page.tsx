import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getLead } from "@/lib/firebase/repo";
import {
  MockDocShell,
  DocSection,
  KeyVals,
} from "@/components/leads/MockDocShell";
import { buildMockTabu } from "@/lib/leads/mockTabu";
import {
  buildMockShuma,
  buildMockTochnit,
  buildMockTabatz,
  DOC_META,
  type MockDocType,
} from "@/lib/leads/mockDocs";
import type { Lead } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

const TYPES: MockDocType[] = ["tabu", "shuma", "tochnit", "tabatz"];

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  await requireAuth();
  const { id, type } = await params;
  if (!TYPES.includes(type as MockDocType)) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();

  const meta = DOC_META[type as MockDocType];
  const doc = renderDoc(type as MockDocType, lead);

  return (
    <MockDocShell
      backHref={`/leads/${id}`}
      title={meta.title}
      subtitle={meta.subtitle}
      docLabel={doc.docLabel}
      docNumber={doc.docNumber}
      issuedAt={doc.issuedAt}
    >
      {doc.body}
    </MockDocShell>
  );
}

function renderDoc(type: MockDocType, lead: Lead) {
  if (type === "tabu") {
    const t = buildMockTabu(lead);
    return {
      docLabel: "מספר נסח",
      docNumber: t.extractNumber,
      issuedAt: t.issuedAt,
      body: (
        <>
          <DocSection title="פרטי המקרקעין">
            <KeyVals
              rows={[
                { label: "גוש", value: t.gush ?? "—", ltr: true },
                { label: "חלקה", value: t.helka ?? "—", ltr: true },
                {
                  label: 'שטח רשום (מ"ר)',
                  value: t.areaSqm != null ? t.areaSqm.toLocaleString("en-US") : "—",
                  ltr: true,
                },
                { label: "יישוב", value: t.city ?? "—" },
                { label: "כתובת", value: t.address ?? "—", wide: true },
                ...(t.parcels.length
                  ? [{ label: "חלקות", value: t.parcels.join(" · "), wide: true }]
                  : []),
              ]}
            />
          </DocSection>

          <DocSection title="בעלויות">
            <Table
              head={["שם הבעלים", "מספר זהות", "מהות הזכות", "חלק בנכס"]}
              rows={t.owners.map((o) => [o.name, o.idMasked, o.right, o.share])}
              ltrCols={[3]}
            />
          </DocSection>

          <DocSection title="משכנתאות ושעבודים">
            {t.liens.length === 0 ? (
              <p className="text-sm text-ink-500">לא נרשמו משכנתאות או שעבודים.</p>
            ) : (
              <Table
                head={["לטובת", "סכום", "תאריך רישום"]}
                rows={t.liens.map((l) => [l.holder, l.amount, l.date])}
                ltrCols={[1, 2]}
              />
            )}
          </DocSection>

          <DocSection title="הערות">
            <NoteList notes={t.notes} />
          </DocSection>
        </>
      ),
    };
  }

  if (type === "shuma") {
    const s = buildMockShuma(lead);
    return {
      docLabel: "מספר שומה",
      docNumber: s.docNumber,
      issuedAt: s.issuedAt,
      body: (
        <>
          <DocSection title="פרטי הנכס">
            <KeyVals
              rows={[
                { label: "גוש/חלקה", value: s.gushHelka, ltr: true, wide: true },
                { label: "כתובת", value: s.address ?? "—", wide: true },
              ]}
            />
          </DocSection>

          <DocSection title="הערכת שווי ותחשיב כלכלי">
            <table className="w-full text-sm">
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/60">
                    <td className="py-2 text-ink-600">{r.label}</td>
                    <td
                      className={`py-2 text-start ltr-nums font-semibold ${
                        r.emphasis ? "text-brand-700" : "text-ink-900"
                      }`}
                    >
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DocSection>

          <DocSection title="הנחות ומגבלות">
            <NoteList notes={s.assumptions} />
          </DocSection>
        </>
      ),
    };
  }

  if (type === "tochnit") {
    const p = buildMockTochnit(lead);
    return {
      docLabel: "מספר מסמך",
      docNumber: p.docNumber,
      issuedAt: p.issuedAt,
      body: (
        <>
          <DocSection title="פרטי המקרקעין">
            <KeyVals
              rows={[
                { label: "גוש/חלקה", value: p.gushHelka, ltr: true, wide: true },
                { label: "כתובת", value: p.address ?? "—", wide: true },
              ]}
            />
          </DocSection>

          <DocSection title="זכויות ומגבלות בנייה">
            <KeyVals rows={p.rows.map((r) => ({ ...r, ltr: true }))} />
          </DocSection>

          <DocSection title="הערות">
            <NoteList notes={p.notes} />
          </DocSection>
        </>
      ),
    };
  }

  // tabatz
  const b = buildMockTabatz(lead);
  return {
    docLabel: "מספר מסמך",
    docNumber: b.docNumber,
    issuedAt: b.issuedAt,
    body: (
      <>
        <DocSection title="פרטי הבית המשותף">
          <KeyVals
            rows={[
              { label: "גוש/חלקה", value: b.gushHelka, ltr: true },
              {
                label: 'סה"כ יחידות רשומות',
                value: b.totalUnits.toLocaleString("en-US"),
                ltr: true,
              },
            ]}
          />
        </DocSection>

        <DocSection title="רשימת תת-חלקות (דירות)">
          <Table
            head={["תת-חלקה", "קומה", 'שטח (מ"ר)', "חדרים", "צמידויות"]}
            rows={b.units.map((u) => [
              u.subParcel,
              u.floor,
              String(u.areaSqm),
              String(u.rooms),
              u.attached,
            ])}
            ltrCols={[0, 1, 2, 3]}
          />
          {b.totalUnits > b.units.length && (
            <p className="mt-2 text-xs text-ink-400">
              מוצגות {b.units.length} מתוך {b.totalUnits} יחידות (רשימה חלקית להדגמה).
            </p>
          )}
        </DocSection>
      </>
    ),
  };
}

/* ------------------------------ tiny helpers ------------------------------ */

function Table({
  head,
  rows,
  ltrCols = [],
}: {
  head: string[];
  rows: string[][];
  ltrCols?: number[];
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-xs text-ink-500">
          {head.map((h, i) => (
            <th key={i} className="py-2 text-start font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line/60">
            {r.map((c, j) => (
              <td
                key={j}
                className={`py-2 ${j === 0 ? "font-medium text-ink-900" : "text-ink-600"} ${
                  ltrCols.includes(j) ? "ltr-nums" : ""
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NoteList({ notes }: { notes: string[] }) {
  return (
    <ul className="list-disc space-y-1 pe-5 text-sm text-ink-700">
      {notes.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ul>
  );
}
