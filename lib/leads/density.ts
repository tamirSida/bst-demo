import type { Lead } from "@/lib/domain/types";
import { density } from "@/lib/domain/compute";
import type { Tone } from "@/lib/status";

/**
 * Presentational view of a lead's existing density (יח"ד/דונם) — the team's
 * first go/no-go signal. The numeric value comes from compute.density(); the
 * tone reuses the density flag already produced by the rule engine (which is
 * config-aware), so the table and the decision card stay perfectly consistent
 * with the live thresholds without re-reading config here.
 */
export interface DensityView {
  /** Raw units-per-dunam, or null when inputs are missing. */
  num: number | null;
  /** Display string: "8.6" or "—". */
  text: string;
  tone: Tone;
  /** Short qualitative note when it's a clear signal (e.g. "פוטנציאל טוב"). */
  note: string | null;
}

const DASH = "—";

export function densityView(lead: Lead): DensityView {
  const num = density(lead);
  if (num == null) return { num: null, text: DASH, tone: "neutral", note: null };

  const flag = lead.flags.find((f) => f.id.startsWith("density_"));
  const tone: Tone =
    flag?.id === "density_low"
      ? "go"
      : flag?.id === "density_high"
        ? "warn"
        : flag?.id === "density_very_high"
          ? "stop"
          : "neutral";
  const note = flag?.id === "density_low" ? "פוטנציאל טוב" : null;

  return { num, text: num.toFixed(1), tone, note };
}
