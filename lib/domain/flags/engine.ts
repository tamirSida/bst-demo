import { FlagSeverity } from "../enums";
import type { TriageConfig } from "../config";
import type { Flag, Lead } from "../types";
import { RULES } from "./rules";

/** Run every applicable rule and collect the resulting flags. Pure. */
export function evaluateFlags(lead: Lead, config: TriageConfig): Flag[] {
  const flags: Flag[] = [];
  for (const rule of RULES) {
    if (!rule.appliesTo.includes(lead.dealType)) continue;
    const out = rule.run({ lead, config });
    if (!out) continue;
    if (Array.isArray(out)) flags.push(...out);
    else flags.push(out);
  }
  return flags;
}

export function hasKill(flags: Flag[]): boolean {
  return flags.some((f) => f.severity === FlagSeverity.Kill);
}

export function hasRed(flags: Flag[]): boolean {
  return flags.some((f) => f.severity === FlagSeverity.Red);
}

/** Display ordering: kill → red → yellow → green → info. */
const SEVERITY_RANK: Record<FlagSeverity, number> = {
  [FlagSeverity.Kill]: 0,
  [FlagSeverity.Red]: 1,
  [FlagSeverity.Yellow]: 2,
  [FlagSeverity.Green]: 3,
  [FlagSeverity.Info]: 4,
};

export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
