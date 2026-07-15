import type { ReactNode } from "react";

/**
 * Formatting helpers. Numbers/dates/currency must render LTR inside RTL text,
 * so every numeric string is wrapped in <span className="ltr-nums">.
 */

/** Wrap arbitrary content so it renders left-to-right inside RTL prose. */
export function Ltr({ children }: { children: ReactNode }) {
  return <span className="ltr-nums">{children}</span>;
}

/** Group thousands with commas (Hebrew locale keeps western digits). */
export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  if (value == null || Number.isNaN(value)) return fallback;
  return new Intl.NumberFormat("he-IL").format(value);
}

/** Shekel currency, no fractional agorot. */
export function formatCurrency(value: number | null | undefined, fallback = "—"): string {
  if (value == null || Number.isNaN(value)) return fallback;
  return `₪${new Intl.NumberFormat("he-IL").format(Math.round(value))}`;
}

/** Percentage from a 0..1 or 0..100 fraction, rendered as "42%". */
export function formatPercent(value: number | null | undefined, fallback = "—"): string {
  if (value == null || Number.isNaN(value)) return fallback;
  // Values stored as fractions (0..1) are scaled up; values already > 1 are pct.
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

/** Short date dd/MM/yyyy for the Israeli reader. */
export function formatDate(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Date + time for timeline entries. */
export function formatDateTime(iso: string | null | undefined, fallback = "—"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} · ${hh}:${min}`;
}
