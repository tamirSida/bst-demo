/**
 * Pure derived-value helpers. No side effects, no I/O — trivially testable.
 */

import type { Lead } from "./types";

/** Existing density in units per dunam, or null if inputs are missing. */
export function density(lead: Pick<Lead, "unitsExisting" | "lotAreaDunam">): number | null {
  if (lead.unitsExisting == null || !lead.lotAreaDunam) return null;
  return lead.unitsExisting / lead.lotAreaDunam;
}

/** Multiplier = planned units / existing units, or null if inputs missing. */
export function multiplier(lead: Pick<Lead, "unitsExisting" | "unitsPlanned">): number | null {
  if (!lead.unitsExisting || lead.unitsPlanned == null) return null;
  return lead.unitsPlanned / lead.unitsExisting;
}

/** Developer share of the new units, or null. */
export function developerShare(lead: Pick<Lead, "developerUnits" | "unitsPlanned">): number | null {
  if (lead.developerUnits == null || !lead.unitsPlanned) return null;
  return lead.developerUnits / lead.unitsPlanned;
}

/**
 * Business days from `from` to `to` using the Israeli work week (Sun–Thu).
 * Friday (5) and Saturday (6) are weekend. Returns a signed integer; negative
 * means `to` is already in the past. `from` day itself is not counted.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (start.getTime() === end.getTime()) return 0;

  const forward = end > start;
  const step = forward ? 1 : -1;
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() !== end.getTime()) {
    cursor.setDate(cursor.getDate() + step);
    const day = cursor.getDay(); // 0=Sun ... 6=Sat
    if (day !== 5 && day !== 6) count += step;
  }
  return count;
}

/** Business days from `now` until an ISO deadline (null when no deadline). */
export function businessDaysUntil(deadlineIso: string | null, now: Date = new Date()): number | null {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) return null;
  return businessDaysBetween(now, deadline);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Round a number to `digits` decimals for display. */
export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
