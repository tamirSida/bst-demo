/**
 * Lead factory + triage recompute. Keeps construction in one place so the
 * pipeline, seed scripts and tests all produce structurally identical leads.
 */

import { DealType, LeadStatus, PlanStatus } from "./enums";
import type { TriageConfig } from "./config";
import type { Flag, Lead } from "./types";
import { evaluateFlags, sortFlags } from "./flags/engine";
import { grade } from "./grading";

let threadCounter = 0;

/** Deterministic-ish thread key for outbound email matching. */
export function nextThreadKey(seq?: number): string {
  const n = seq ?? ++threadCounter;
  return `BST-L-${String(n).padStart(4, "0")}`;
}

export interface NewLeadInput extends Partial<Lead> {
  dealType: DealType;
  projectName: string;
}

/** Build a fully-formed Lead from partial input, filling safe defaults. */
export function createLead(input: NewLeadInput): Lead {
  const now = new Date().toISOString();
  return {
    id: input.id ?? cryptoId(),
    dealType: input.dealType,
    projectName: input.projectName,
    city: input.city ?? null,
    address: input.address ?? null,
    gushHelka: input.gushHelka ?? [],
    sourceType: input.sourceType ?? null,
    contact: input.contact ?? null,
    sourceFee: input.sourceFee ?? null,
    status: input.status ?? LeadStatus.New,
    leadReceivedAt: input.leadReceivedAt ?? now,
    submissionDeadline: input.submissionDeadline ?? null,
    rejectionReason: input.rejectionReason ?? null,
    notes: input.notes ?? "",
    unitsExisting: input.unitsExisting ?? null,
    unitsPlanned: input.unitsPlanned ?? null,
    developerUnits: input.developerUnits ?? null,
    lotAreaDunam: input.lotAreaDunam ?? null,
    shops: input.shops ?? null,
    planStatus: input.planStatus ?? PlanStatus.Unknown,
    planNumber: input.planNumber ?? null,
    signaturePct: input.signaturePct ?? null,
    publicHousingPct: input.publicHousingPct ?? null,
    registeredInMaagar: input.registeredInMaagar ?? null,
    sentToPlanningAt: input.sentToPlanningAt ?? null,
    planningResultAt: input.planningResultAt ?? null,
    sentToArchitectAt: input.sentToArchitectAt ?? null,
    sentToEconomicsAt: input.sentToEconomicsAt ?? null,
    offerAt: input.offerAt ?? null,
    flags: input.flags ?? [],
    grade: input.grade ?? null,
    aiSummary: input.aiSummary ?? null,
    provenance: input.provenance ?? {},
    extra: input.extra ?? {},
    threadKey: input.threadKey ?? nextThreadKey(),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

/**
 * Recompute the derived triage fields (developerUnits, flags, grade) for a lead.
 * Returns a NEW lead — never mutates. Call this after any fact changes.
 */
export function recomputeTriage(
  lead: Lead,
  config: TriageConfig,
  extraFlags: Flag[] = [],
): Lead {
  // Derive developer units when both planned and returned-to-owners are known.
  const developerUnits =
    lead.developerUnits ??
    (lead.unitsPlanned != null && lead.unitsExisting != null
      ? lead.unitsPlanned - lead.unitsExisting
      : null);

  const base: Lead = { ...lead, developerUnits };
  const flags = sortFlags([...evaluateFlags(base, config), ...extraFlags]);
  const computed = grade(base, flags, config);

  return { ...base, flags, grade: computed, updatedAt: new Date().toISOString() };
}

function cryptoId(): string {
  // Node 26 / modern browsers both expose crypto.randomUUID.
  return globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
}

/**
 * "projectName, city" for display — without repeating the city when the project
 * name already contains it (e.g. "מתחם הדרים 21-23 לוד" + "לוד").
 */
export function displayName(lead: Pick<Lead, "projectName" | "city">): string {
  const name = lead.projectName.trim();
  const city = lead.city?.trim();
  if (!city || name.includes(city)) return name;
  return `${name}, ${city}`;
}
