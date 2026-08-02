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
import { GradeCell } from "./GradeCell";
import { DensityCell } from "./DensityCell";
import {
  COLUMNS,
  SORT_ACCESSOR,
  WIDE_QUERY,
  WIDTH_COMPACT,
  WIDTH_FULL,
  type LeadTableRow,
} from "./leadColumns";

// Re-exported so existing importers (lib/leads/rows.ts, the leads page) keep
// working — the type's home is now leadColumns.ts alongside the contract.
export type { LeadTableRow };

const PAGE = 50;

/**
 * Verdict as an edge on the row, not just as coloured words.
 *
 * Colour alone is a weak channel here: three tones at 12px, repeated 38 times,
 * blur into texture. A rule at the row's inline-start edge is read positionally
 * — you can see the shape of the book down the column without reading any of
 * it. Kept to a 3px border on the first cell so it costs no layout: under
 * `table-fixed` with border-box, the border sits inside the declared width.
 */
const TONE_EDGE: Record<Tone, string> = {
  go: "border-s-go-500",
  warn: "border-s-warn-500",
  stop: "border-s-stop-500",
  brand: "border-s-brand-500",
  neutral: "border-s-transparent",
};

const TONE_TEXT: Record<Tone, string> = {
  go: "text-go-700",
  warn: "text-warn-700",
  stop: "text-stop-700",
  brand: "text-brand-700",
  neutral: "text-ink-500",
};

type SortDir = "asc" | "desc";





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
  // Newest first by default — this is an inbox, and the header shows it as the
  // active sort rather than leaving the order unexplained.
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>({
    key: "received",
    dir: "desc",
  });

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

  // One scale for the whole column: the marks are only comparable if every row
  // is measured against the same min..max.
  const densityRange = useMemo(() => {
    const values = rows.map((r) => r.densityNum).filter((v): v is number => v != null);
    return values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : { min: null, max: null };
  }, [rows]);

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
                  "hover:bg-surface-muted/50",
                )}
              >
                <td
                  className={cn(
                    "border-s-[3px] px-3 py-3 whitespace-nowrap text-ink-500",
                    TONE_EDGE[r.verdictTone ?? "neutral"],
                  )}
                >
                  <span className="ltr-nums">{r.received}</span>
                </td>
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
                  <DensityCell
                    text={r.density}
                    value={r.densityNum}
                    tone={r.densityTone}
                    min={densityRange.min}
                    max={densityRange.max}
                  />
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
                {/* Every optional column must be gated here in the SAME order
                    as COLUMNS, or the colgroup widths and the cells drift apart
                    the moment the breakpoint drops them. */}
                {wide && (
                  <>
                    <td className="px-3 py-3 text-ink-700 whitespace-nowrap">{r.dealType}</td>
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
