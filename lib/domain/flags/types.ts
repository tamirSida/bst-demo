import type { DealType } from "../enums";
import type { TriageConfig } from "../config";
import type { Flag, Lead } from "../types";

export interface RuleContext {
  lead: Lead;
  config: TriageConfig;
}

/** A single triage rule: pure, returns a flag, several, or nothing. */
export type RuleFn = (ctx: RuleContext) => Flag | Flag[] | null;

/** A rule plus the deal types it applies to (Open/Closed registration). */
export interface RegisteredRule {
  id: string;
  appliesTo: DealType[];
  run: RuleFn;
}

export type { Flag, Lead };
