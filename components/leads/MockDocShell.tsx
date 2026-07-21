import Link from "next/link";
import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { PrintButton } from "./PrintButton";

/**
 * Reusable frame for every seeded demo document (נסח, שומה, מצב תכנוני, תשריט).
 * Always carries the "מסמך הדגמה · אינו מסמך רשמי" banner + footer so a produced
 * document can never be mistaken for a genuine official record.
 */
export function MockDocShell({
  backHref,
  title,
  subtitle,
  docLabel,
  docNumber,
  issuedAt,
  children,
}: {
  backHref: string;
  title: string;
  subtitle: string;
  /** e.g. "מספר נסח" / "מספר מסמך". */
  docLabel: string;
  docNumber: string;
  issuedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-muted px-4 py-6 print:bg-white print:p-0">
      <div className="print:hidden mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-700"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          חזרה לליד
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-8 shadow-card print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warn-300 bg-warn-50 px-4 py-3 text-sm text-warn-800">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          <span>
            <span className="font-semibold">מסמך הדגמה</span> · נתונים לדוגמה בלבד ·
            אינו מסמך רשמי.
          </span>
        </div>

        <header className="border-b border-line pb-4 text-center">
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-3 flex justify-center gap-6 text-xs text-ink-500">
            <span>
              {docLabel}:{" "}
              <span className="ltr-nums font-semibold text-ink-700">{docNumber}</span>
            </span>
            <span>
              תאריך הפקה:{" "}
              <span className="ltr-nums font-semibold text-ink-700">{issuedAt}</span>
            </span>
          </div>
        </header>

        {children}

        <footer className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-400">
          מסמך זה הופק לצורכי הדגמה במערכת BST בלבד ואינו מהווה מסמך רשמי.
        </footer>
      </article>
    </div>
  );
}

/* -------------------------- small render helpers -------------------------- */

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-bold text-brand-700">{title}</h2>
      {children}
    </section>
  );
}

/** A label:value list rendered as a two-column grid. */
export function KeyVals({
  rows,
}: {
  rows: { label: string; value: string; emphasis?: boolean; ltr?: boolean; wide?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {rows.map((r, i) => (
        <div key={i} className={r.wide ? "col-span-2" : ""}>
          <dt className="inline text-ink-500">{r.label}: </dt>
          <dd
            className={`inline font-medium ${r.emphasis ? "text-brand-700" : "text-ink-900"} ${
              r.ltr ? "ltr-nums" : ""
            }`}
          >
            {r.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
