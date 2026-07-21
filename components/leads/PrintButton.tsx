"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";

/** Print / save-as-PDF the current document. Hidden from the printout itself. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <FontAwesomeIcon icon={faPrint} />
      הדפס / שמור כ-PDF
    </button>
  );
}
