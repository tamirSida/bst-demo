/**
 * Shared traffic-light mapping. One source of truth so every component tints
 * flags/verdicts/statuses the same way.
 */

import type { FlagSeverity, Verdict } from "@/lib/domain/enums";

export type Tone = "go" | "warn" | "stop" | "brand" | "neutral";

/** Verdict → traffic-light tone (advance=GO, review/curable=WARN, reject/killed=STOP). */
export function verdictTone(verdict: Verdict): Tone {
  switch (verdict) {
    case "advance":
      return "go";
    case "review":
    case "curable":
      return "warn";
    case "reject":
    case "killed":
      return "stop";
    default:
      return "neutral";
  }
}

/** Flag severity → tone (green=GO, yellow=WARN, red/kill=STOP, info=brand). */
export function flagTone(severity: FlagSeverity): Tone {
  switch (severity) {
    case "green":
      return "go";
    case "yellow":
      return "warn";
    case "red":
    case "kill":
      return "stop";
    default:
      return "brand";
  }
}

/** Sort order for flags: kill → red → yellow → green → info. */
export const FLAG_SORT: Record<FlagSeverity, number> = {
  kill: 0,
  red: 1,
  yellow: 2,
  green: 3,
  info: 4,
};

/** Solid, filled tone classes (used for banners / strong emphasis). */
export const TONE_SOLID: Record<Tone, string> = {
  go: "bg-go-500 text-white",
  warn: "bg-warn-500 text-white",
  stop: "bg-stop-500 text-white",
  brand: "bg-brand-600 text-white",
  neutral: "bg-surface-muted text-ink-700",
};

/** Soft, tinted tone classes (used for chips / subtle badges). */
export const TONE_SOFT: Record<Tone, string> = {
  go: "bg-go-50 text-go-700 border-go-100",
  warn: "bg-warn-50 text-warn-700 border-warn-100",
  stop: "bg-stop-50 text-stop-700 border-stop-100",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  neutral: "bg-surface-muted text-ink-700 border-line",
};

/** Text-only tone (icons). */
export const TONE_TEXT: Record<Tone, string> = {
  go: "text-go-600",
  warn: "text-warn-600",
  stop: "text-stop-600",
  brand: "text-brand-600",
  neutral: "text-ink-500",
};

/** Meter track (faint) — for the 0–100 grade bar in the leads table. */
export const TONE_TRACK: Record<Tone, string> = {
  go: "bg-go-100",
  warn: "bg-warn-100",
  stop: "bg-stop-100",
  brand: "bg-brand-100",
  neutral: "bg-line",
};

/** Meter fill (solid -500) — the filled portion of the grade bar. */
export const TONE_FILL: Record<Tone, string> = {
  go: "bg-go-500",
  warn: "bg-warn-500",
  stop: "bg-stop-500",
  brand: "bg-brand-600",
  neutral: "bg-ink-400",
};
