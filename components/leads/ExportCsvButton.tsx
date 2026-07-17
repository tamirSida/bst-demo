"use client";

import { faFileExcel } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";

/** A flat, already-serialized row for CSV export (built server-side). */
export interface CsvRow {
  projectName: string;
  city: string;
  dealType: string;
  status: string;
  unitsExisting: string;
  unitsPlanned: string;
  deadline: string;
  score: string;
  verdict: string;
}

const HEADERS: Record<keyof CsvRow, string> = {
  projectName: "שם הפרויקט",
  city: "עיר",
  dealType: "סוג עסקה",
  status: "סטטוס",
  unitsExisting: 'יח"ד קיימות',
  unitsPlanned: 'יח"ד יוצאות',
  deadline: "מועד הגשה",
  score: "ציון",
  verdict: "המלצה",
};

/** Escape a CSV cell (quote + double inner quotes). */
function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * The Excel escape hatch. Builds a UTF-8 CSV with a BOM (so Excel renders Hebrew
 * correctly) from the currently-visible rows and downloads it. Deliberately
 * visible — it is the users' safety blanket coming off the old spreadsheet.
 */
export function ExportCsvButton({ rows }: { rows: CsvRow[] }) {
  const download = () => {
    const keys = Object.keys(HEADERS) as (keyof CsvRow)[];
    const head = keys.map((k) => cell(HEADERS[k])).join(",");
    const body = rows.map((r) => keys.map((k) => cell(r[k])).join(",")).join("\r\n");
    const csv = `﻿${head}\r\n${body}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" icon={faFileExcel} onClick={download}>
      ייצוא לאקסל (CSV)
    </Button>
  );
}
