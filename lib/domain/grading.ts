/**
 * Grading — turns flags + facts into a 0–100 score and a verdict.
 *
 * Design: five independent dimension sub-scores (each 0–100), combined by the
 * configurable weights. Every adjustment is tied to a specific flag id or fact,
 * so the score is fully explainable. A kill flag short-circuits to a null score.
 */

import { FlagSeverity, LeadSourceType, Verdict } from "./enums";
import type { TriageConfig } from "./config";
import type { Flag, Grade, GradeBreakdown, Lead } from "./types";
import { hasKill, hasRed } from "./flags/engine";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function economicsScore(lead: Lead, ids: Set<string>): number {
  let s = 55;
  if (ids.has("density_low")) s += 20;
  if (ids.has("density_high")) s -= 12;
  if (ids.has("density_very_high")) s -= 25;
  if (ids.has("multiplier_below_floor")) s -= 16;
  if (ids.has("developer_share_low")) s -= 20;
  if (ids.has("source_fee_elevated")) s -= 8;
  if (ids.has("source_fee_high")) s -= 18;
  // Reward a healthy, known multiplier that cleared the floor.
  if (lead.unitsPlanned && lead.unitsExisting && !ids.has("multiplier_below_floor")) {
    s += 10;
  }
  return clamp(s);
}

function planningScore(ids: Set<string>): number {
  if (ids.has("plan_approved")) return 90;
  if (ids.has("plan_in_process")) return 60;
  if (ids.has("plan_policy_only")) return 50;
  if (ids.has("plan_no_policy")) return 25;
  if (ids.has("plan_conflicts")) return 10;
  return 45; // unknown
}

function seriousnessScore(lead: Lead): number {
  let s = 55;
  switch (lead.sourceType) {
    case LeadSourceType.TenantLawyer:
    case LeadSourceType.Municipality:
      s += 15;
      break;
    case LeadSourceType.Organizer:
      s += 5;
      break;
    case LeadSourceType.Broker:
    case LeadSourceType.Other:
      s -= 10;
      break;
    default:
      break;
  }
  if (lead.signaturePct != null) {
    if (lead.signaturePct >= 66) s += 25;
    else if (lead.signaturePct >= 50) s += 15;
    else s += 5;
  }
  if (lead.contact?.email && lead.contact?.phone) s += 5;
  return clamp(s);
}

function strategicScore(ids: Set<string>): number {
  let s = 55;
  if (ids.has("city_target")) s += 20;
  if (ids.has("city_unknown")) s -= 10;
  if (ids.has("small_mitcham")) s -= 5;
  return clamp(s);
}

function timelineScore(ids: Set<string>): number {
  let s = 70;
  if (ids.has("deadline_impossible")) s -= 30;
  if (ids.has("deadline_tight")) s -= 12;
  if (ids.has("plan_no_policy")) s -= 15;
  if (ids.has("plan_policy_only")) s -= 8;
  return clamp(s);
}

/** Compute the full grade for a lead given its flags and config. */
export function grade(lead: Lead, flags: Flag[], config: TriageConfig): Grade {
  const ids = new Set(flags.map((f) => f.id));

  const breakdown: GradeBreakdown = {
    economics: economicsScore(lead, ids),
    planning: planningScore(ids),
    seriousness: seriousnessScore(lead),
    strategic: strategicScore(ids),
    timeline: timelineScore(ids),
  };

  const { weights } = config;
  const composite = Math.round(
    breakdown.economics * weights.economics +
      breakdown.planning * weights.planning +
      breakdown.seriousness * weights.seriousness +
      breakdown.strategic * weights.strategic +
      breakdown.timeline * weights.timeline,
  );

  if (hasKill(flags)) {
    return { score: null, verdict: Verdict.Killed, breakdown, economicsReady: false };
  }
  if (hasRed(flags)) {
    return { score: composite, verdict: Verdict.Curable, breakdown, economicsReady: false };
  }

  const verdict =
    composite >= config.advanceAt
      ? Verdict.Advance
      : composite >= config.reviewAt
        ? Verdict.Review
        : Verdict.Reject;

  return { score: composite, verdict, breakdown, economicsReady: true };
}

/** Convenience: severity present in the flag set (for UI badges). */
export function topSeverity(flags: Flag[]): FlagSeverity | null {
  if (flags.some((f) => f.severity === FlagSeverity.Kill)) return FlagSeverity.Kill;
  if (flags.some((f) => f.severity === FlagSeverity.Red)) return FlagSeverity.Red;
  if (flags.some((f) => f.severity === FlagSeverity.Yellow)) return FlagSeverity.Yellow;
  if (flags.some((f) => f.severity === FlagSeverity.Green)) return FlagSeverity.Green;
  return null;
}
