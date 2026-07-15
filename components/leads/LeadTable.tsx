"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/status";

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
  deadline: string;
  deadlineTone: Tone | null;
  verdict: string | null;
  verdictTone: Tone | null;
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

export function LeadTable({ rows }: { rows: LeadTableRow[] }) {
  const [shown, setShown] = useState(PAGE);

  if (!rows.length) {
    return (
      <EmptyState
        icon={faFolderOpen}
        title="לא נמצאו לידים"
        hint="נסו לשנות את הסינון או מונח החיפוש."
      />
    );
  }

  const visible = rows.slice(0, shown);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-ink-500 text-xs font-semibold">
              <th className="text-start font-semibold px-4 py-3">שם הפרויקט</th>
              <th className="text-start font-semibold px-4 py-3">עיר</th>
              <th className="text-start font-semibold px-4 py-3">סוג עסקה</th>
              <th className="text-start font-semibold px-4 py-3">סטטוס</th>
              <th className="text-start font-semibold px-4 py-3 whitespace-nowrap">{'יח"ד קיימות'}</th>
              <th className="text-start font-semibold px-4 py-3 whitespace-nowrap">{'יח"ד יוצאות'}</th>
              <th className="text-start font-semibold px-4 py-3">מועד הגשה</th>
              <th className="text-start font-semibold px-4 py-3">המלצה</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  "group border-t border-line transition-colors cursor-pointer",
                  r.alarm ? "bg-stop-50/40 hover:bg-stop-50" : "hover:bg-surface-muted/60",
                )}
              >
                <td className="px-4 py-3 font-semibold text-ink-900">
                  <Link href={`/leads/${r.id}`} className="block hover:text-brand-700">
                    {r.projectName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-700">{r.city}</td>
                <td className="px-4 py-3 text-ink-700 whitespace-nowrap">{r.dealType}</td>
                <td className="px-4 py-3">
                  <span className={cn("font-semibold", TONE_TEXT[r.statusTone])}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-ink-700 ltr-nums">{r.unitsExisting}</td>
                <td className="px-4 py-3 text-ink-700 ltr-nums">{r.unitsPlanned}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.deadlineTone ? (
                    <span className={cn("font-semibold ltr-nums", TONE_TEXT[r.deadlineTone])}>
                      {r.deadline}
                    </span>
                  ) : (
                    <span className="text-ink-400 ltr-nums">{r.deadline}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.verdict && r.verdictTone ? (
                    <Badge tone={r.verdictTone} size="sm">
                      {r.verdict}
                    </Badge>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
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
        <span>
          מציג <span className="ltr-nums">{visible.length}</span> מתוך{" "}
          <span className="ltr-nums">{rows.length}</span> לידים
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
