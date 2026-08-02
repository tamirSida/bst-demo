/**
 * The leads table's layout contract, kept as pure data so it can be asserted in
 * tests rather than only discovered in production.
 *
 * Four things here have broken silently before, none of which the compiler
 * catches — see leadColumns.test.ts, which now fails on each:
 *   1. WIDTH_FULL / WIDTH_COMPACT are HAND-SUMMED from the column widths. Change
 *      a width without re-summing and the table overflows its container; under
 *      RTL that clips the LAST columns and the row chevron off the screen edge.
 *   2. A column marked `sortable` with no SORT_ACCESSOR entry throws a
 *      TypeError the first time its header is clicked.
 *   3. `optional` columns are dropped below the wide breakpoint by slicing them
 *      out of this list. They must therefore be LAST, or dropping them silently
 *      reorders the remaining columns away from the <tbody> cell order.
 *   4. COLUMNS is data but the <tbody> cells are hand-written JSX in matching
 *      order. The two must move in lockstep; nothing enforces that at compile
 *      time, so the test counts the cells in the source.
 */

import type { Tone } from "@/lib/status";
import type { Verdict } from "@/lib/domain/enums";

/**
 * Fully-serialized row for the table (built server-side so no domain logic runs
 * on the client). Column order matches the RTL header.
 */
export interface LeadTableRow {
  id: string;
  /** When the lead arrived — formatted date + time. */
  received: string;
  projectName: string;
  city: string;
  dealType: string;
  status: string;
  statusTone: Tone;
  unitsExisting: string;
  unitsPlanned: string;
  density: string;
  densityTone: Tone;
  deadline: string;
  deadlineTone: Tone | null;
  verdict: string | null;
  verdictTone: Tone | null;
  verdictKey: Verdict | null;
  score: number | null;
  /** Raw values for sorting (display strings above lose type/order). */
  unitsExistingNum: number | null;
  unitsPlannedNum: number | null;
  densityNum: number | null;
  deadlineTs: number | null;
  receivedTs: number | null;
  /** True when a red/kill flag is present → subtle row tint. */
  alarm: boolean;
}

export interface LeadColumn {
  key: string;
  label: string;
  sortable: boolean;
  nowrap?: boolean;
  /** rem string, e.g. "9.5rem". Summed into the table's min-width. */
  width: string;
  /** Dropped below WIDE_QUERY. Must be last in the list — see note 3 above. */
  optional?: boolean;
}

/**
 * Order is by decision value, not by the shape of the data. Ten columns do not
 * fit a 1280–1440 laptop, so something must scroll — and in RTL the overflow
 * clips whatever is LAST. Density and the verdict are what the go/no-go turns
 * on, so they sit near the start and are always on screen; unit counts are
 * reference detail and are the ones you scroll for (or lose on a narrow screen).
 */
export const COLUMNS: LeadColumn[] = [
  // First in DOM order = visually rightmost under RTL, where the eye starts.
  { key: "received", label: "תאריך קבלה", sortable: true, nowrap: true, width: "8.5rem" },
  { key: "projectName", label: "שם הפרויקט", sortable: true, width: "11rem" },
  { key: "density", label: "צפיפות", sortable: true, nowrap: true, width: "5.5rem" },
  // Fits the score chip + meter on one line with the verdict label stacked
  // beneath (see GradeCell) — half what the single-line layout demanded.
  { key: "score", label: "ציון והמלצה", sortable: true, width: "9rem" },
  { key: "deadline", label: "מועד הגשה", sortable: true, nowrap: true, width: "7rem" },
  { key: "status", label: "סטטוס", sortable: true, width: "7.5rem" },
  { key: "city", label: "עיר", sortable: true, width: "6rem" },
  // Optional, lowest decision value, and therefore last: deal type is usually
  // implied by the compound, and planned units are frequently unknown.
  { key: "dealType", label: "סוג עסקה", sortable: true, width: "7rem", optional: true },
  { key: "unitsExisting", label: 'יח"ד קיימות', sortable: true, nowrap: true, width: "5.5rem", optional: true },
  { key: "unitsPlanned", label: 'יח"ד יוצאות', sortable: true, nowrap: true, width: "5.5rem", optional: true },
];

/**
 * Above this there is room for the full set; below it the optional ones go.
 *
 * Derived, not guessed: the content column is the viewport minus the sidebar
 * and page padding (SHELL_CHROME_REM), so the breakpoint must be high enough
 * that WIDTH_FULL still fits inside it. The test asserts that relationship.
 */
export const WIDE_QUERY = "(min-width: 1560px)";
export const WIDE_BREAKPOINT_PX = 1560;

/** Sidebar + page padding either side of the table, in rem. */
export const SHELL_CHROME_REM = 21;

/** The widest table that fits without scrolling at a given viewport width. */
export function contentWidthRem(viewportPx: number): number {
  return viewportPx / 16 - SHELL_CHROME_REM;
}

/** The trailing row-open chevron cell, which has no COLUMNS entry. */
export const CHEVRON_WIDTH_REM = 2.5;

/** Column sort keys → how to pull a comparable value out of a row. */
export const SORT_ACCESSOR: Record<
  string,
  (r: LeadTableRow) => string | number | null
> = {
  received: (r) => r.receivedTs,
  projectName: (r) => r.projectName,
  city: (r) => r.city,
  dealType: (r) => r.dealType,
  status: (r) => r.status,
  unitsExisting: (r) => r.unitsExistingNum,
  unitsPlanned: (r) => r.unitsPlannedNum,
  density: (r) => r.densityNum,
  deadline: (r) => r.deadlineTs,
  score: (r) => r.score,
};

/** rem value of a "9.5rem" string. */
export function remOf(width: string): number {
  const n = Number.parseFloat(width);
  if (Number.isNaN(n)) throw new Error(`unparseable column width: ${width}`);
  return n;
}

/** Total min-width for a set of columns, including the chevron cell. */
export function sumWidth(columns: LeadColumn[]): string {
  const total = columns.reduce((n, c) => n + remOf(c.width), CHEVRON_WIDTH_REM);
  // Trim float noise (6.25 + 9.5 + … accumulates 0.00000001).
  return `${Number(total.toFixed(4))}rem`;
}

/** Table min-width with every column shown. */
export const WIDTH_FULL = sumWidth(COLUMNS);
/** Table min-width with the optional columns dropped. */
export const WIDTH_COMPACT = sumWidth(COLUMNS.filter((c) => !c.optional));
