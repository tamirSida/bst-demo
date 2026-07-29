"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faSort,
  faSortDown,
  faSortUp,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/status";
import type { Verdict } from "@/lib/domain/enums";
import { GradeCell } from "./GradeCell";

/**
 * Fully-serialized row for the table (built server-side so no domain logic runs
 * on the client). Column order matches the RTL header.
 */
export interface LeadTableRow {
  id: string;
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
  /** True when a red/kill flag is present → subtle row tint. */
  alarm: boolean;
}

const PAGE = 50;

const TONE_TEXT: Record<Tone, string> = {
  go: "text-go-700",
  warn: "text-warn-700",
  stop: "text-stop-700",
  brand: "text-brand-700",
  neutral: "text-ink-500",
};

type SortDir = "asc" | "desc";

/** Column sort keys → how to pull a comparable value out of a row. */
const SORT_ACCESSOR: Record<string, (r: LeadTableRow) => string | number | null> = {
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

/*
 * Every column carries an explicit width and the table is laid out `table-fixed`.
 * With the default `auto` layout the browser sizes columns from their content,
 * so one lead with a paragraph-length project name widens that column and
 * squeezes the rest — and because the widths are recomputed per render, sorting
 * or filtering visibly shifts every column. Fixed widths make the geometry a
 * property of the table instead of of whichever rows happen to be on screen.
 */
/*
 * Order is by decision value, not by how the data happens to be shaped. Ten
 * columns will not fit a laptop, so something has to scroll — and in RTL that
 * clips from the left, i.e. whatever is last. Density and the verdict are what
 * the go/no-go actually turns on, so they sit immediately after the name and
 * are always on screen; unit counts are reference detail and can be the ones
 * you scroll for.
 */

/*
 * `optional` columns are dropped on anything narrower than a large desktop.
 * Ten columns simply do not fit a 1280–1440 laptop — the content area there is
 * ~940–1100px — and in RTL the overflow clips from the left, taking the
 * row-open chevron and the last columns off-screen. These two are the lowest
 * decision value (planned units are frequently unknown and render "—"), so
 * they are the ones to shed; everything the go/no-go turns on stays.
 */
const COLUMNS: {
  key: string;
  label: string;
  sortable: boolean;
  nowrap?: boolean;
  width: string;
  optional?: boolean;
}[] = [
  { key: "projectName", label: "שם הפרויקט", sortable: true, width: "12rem" },
  { key: "density", label: 'צפיפות', sortable: true, nowrap: true, width: "5.5rem" },
  // Fits the score chip + meter on one line with the verdict label stacked
  // beneath (see GradeCell) — half what the single-line layout demanded.
  { key: "score", label: "ציון והמלצה", sortable: true, width: "9.5rem" },
  { key: "deadline", label: "מועד הגשה", sortable: true, width: "7.5rem" },
  { key: "status", label: "סטטוס", sortable: true, width: "8rem" },
  { key: "city", label: "עיר", sortable: true, width: "6.25rem" },
  { key: "dealType", label: "סוג עסקה", sortable: true, width: "7.5rem" },
  { key: "unitsExisting", label: 'יח"ד קיימות', sortable: true, nowrap: true, width: "5.5rem", optional: true },
  { key: "unitsPlanned", label: 'יח"ד יוצאות', sortable: true, nowrap: true, width: "5.5rem", optional: true },
];

/** Above this, there is room for the full set; below it, the optional two go. */
const WIDE_QUERY = "(min-width: 1500px)";

/* Sum of the rendered column widths + the 2.5rem chevron cell. */
const WIDTH_FULL = "69.75rem"; // all nine columns (>=1500px viewports)
const WIDTH_COMPACT = "58.75rem"; // without the two יח"ד columns — fits a 1280 laptop

/** Compare two rows by a column: numbers numerically, strings by Hebrew locale, nulls last. */
function compareRows(a: LeadTableRow, b: LeadTableRow, key: string, dir: SortDir): number {
  const av = SORT_ACCESSOR[key](a);
  const bv = SORT_ACCESSOR[key](b);
  // Missing values always sink to the bottom, regardless of direction.
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  let cmp: number;
  if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
  else cmp = String(av).localeCompare(String(bv), "he");
  return dir === "asc" ? cmp : -cmp;
}

export function LeadTable({ rows }: { rows: LeadTableRow[] }) {
  const router = useRouter();
  const [shown, setShown] = useState(PAGE);
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);

  /*
   * Drive the column set from a media query rather than CSS `hidden`, so the
   * <colgroup>, the headers and the cells always agree about how many columns
   * exist — a hidden <td> still leaves its <col> reserving width. The server
   * snapshot renders the full set, and the client narrows it after hydration,
   * so there is no markup mismatch.
   */
  const wide = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
  const columns = useMemo(
    () => (wide ? COLUMNS : COLUMNS.filter((c) => !c.optional)),
    [wide],
  );

  // Only claim the table scrolls when it actually does — at wide viewports it
  // may fit, and a hint pointing at nothing is worse than no hint.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => compareRows(a, b, sort.key, sort.dir));
  }, [rows, sort]);

  // Toggle asc → desc → off on repeated clicks of the same column.
  const toggleSort = (key: string) =>
    setSort((cur) =>
      cur?.key !== key ? { key, dir: "asc" } : cur.dir === "asc" ? { key, dir: "desc" } : null,
    );

  if (!rows.length) {
    return (
      <EmptyState
        icon={faFolderOpen}
        title="לא נמצאו לידים"
        hint="נסו לשנות את הסינון או מונח החיפוש."
      />
    );
  }

  const visible = sorted.slice(0, shown);

  return (
    <div>
      <div ref={scrollerRef} className="overflow-x-auto">
        <table
          className="w-full table-fixed text-sm border-collapse"
          style={{ minWidth: wide ? WIDTH_FULL : WIDTH_COMPACT }}
        >
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width }} />
            ))}
            <col style={{ width: "2.5rem" }} />
          </colgroup>
          <thead>
            <tr className="text-ink-500 text-xs font-medium">
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const icon = !active ? faSort : sort.dir === "asc" ? faSortUp : faSortDown;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "text-start font-medium px-3 py-3 select-none",
                      col.nowrap && "whitespace-nowrap",
                    )}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 hover:text-ink-800 transition-colors",
                        active && "text-brand-700",
                      )}
                    >
                      {col.label}
                      <FontAwesomeIcon
                        icon={icon}
                        className={cn("text-[10px]", active ? "text-brand-500" : "text-ink-300")}
                      />
                    </button>
                  </th>
                );
              })}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/leads/${r.id}`)}
                className={cn(
                  "group border-t border-line transition-colors cursor-pointer",
                  r.alarm ? "bg-stop-50/40 hover:bg-stop-50" : "hover:bg-surface-muted/60",
                )}
              >
                {/* Free text from an inbound email can be a whole paragraph;
                    clamp it to one line and keep the full value in the title so
                    nothing is actually lost. */}
                <td className="px-3 py-3 font-medium text-ink-900">
                  <Link
                    href={`/leads/${r.id}`}
                    title={r.projectName}
                    className="block truncate hover:text-brand-700"
                  >
                    {r.projectName}
                  </Link>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={cn("ltr-nums font-medium", TONE_TEXT[r.densityTone])}>
                    {r.density}
                  </span>
                </td>
                <td className="px-3 py-3 overflow-hidden">
                  <GradeCell
                    score={r.score}
                    verdictKey={r.verdictKey}
                    verdictLabel={r.verdict}
                    tone={r.verdictTone}
                  />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {r.deadlineTone ? (
                    <span className={cn("font-medium ltr-nums", TONE_TEXT[r.deadlineTone])}>
                      {r.deadline}
                    </span>
                  ) : (
                    <span className="text-ink-400 ltr-nums">{r.deadline}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={r.statusTone} size="sm">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-ink-700">
                  <span className="block truncate" title={r.city}>
                    {r.city}
                  </span>
                </td>
                <td className="px-3 py-3 text-ink-700 whitespace-nowrap">{r.dealType}</td>
                {wide && (
                  <>
                    <td className="px-3 py-3 text-ink-700">
                      <span className="ltr-nums">{r.unitsExisting}</span>
                    </td>
                    <td className="px-3 py-3 text-ink-700">
                      <span className="ltr-nums">{r.unitsPlanned}</span>
                    </td>
                  </>
                )}
                <td className="px-2 py-3 text-ink-300 group-hover:text-brand-500">
                  <Link href={`/leads/${r.id}`} aria-label="פתיחת ליד">
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink-500 border-t border-line">
        <span className="flex items-center gap-3">
          <span>
            מציג <span className="ltr-nums">{visible.length}</span> מתוך{" "}
            <span className="ltr-nums">{rows.length}</span> לידים
          </span>
          {/* The table is wider than the panel by design (all columns stay
              available). Without saying so it just looks like a table with
              columns missing. */}
          {scrollable && (
            <span className="hidden sm:inline text-ink-400">
              · גללו לצדדים ליתר העמודות
            </span>
          )}
        </span>
        {shown < rows.length && (
          <Button variant="ghost" size="sm" onClick={() => setShown((s) => s + PAGE)}>
            הצג עוד
          </Button>
        )}
      </div>
    </div>
  );
}
