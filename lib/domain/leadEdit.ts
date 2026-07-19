/**
 * Advanced (raw JSON) lead editing policy — kept pure and unit-testable.
 *
 * A power user can edit the lead's JSON and add arbitrary fields. This module is
 * the safety layer: it rebuilds from the authoritative SERVER lead, validates the
 * editable known fields (so a "24" string can't corrupt grading math), forces the
 * identity fields, drops the computed fields (recomputeTriage owns them), and
 * routes any UNKNOWN keys into `lead.extra` rather than the top level.
 */

import { z } from "zod";
import {
  DealType,
  FeeStructure,
  LeadSourceType,
  LeadStatus,
  PlanStatus,
  RejectionReason,
} from "./enums";
import type { Lead, LeadFactKey } from "./types";

const values = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [string, ...string[]];

/** Identity — echoed from the server lead, never taken from client input. */
export const SYSTEM_KEYS = ["id", "threadKey", "createdAt"] as const;
/** Always recomputed by recomputeTriage — dropped from input. */
export const COMPUTED_KEYS = ["flags", "grade", "updatedAt"] as const;
/** Keys inside `extra` the pipeline depends on — preserved from the server lead. */
export const RESERVED_EXTRA = ["documentTypes", "threadKey", "origin"] as const;

/** The fact keys that carry provenance — touched ones get a "manual" stamp. */
const FACT_KEYS = new Set<LeadFactKey>([
  "city",
  "address",
  "gushHelka",
  "sourceType",
  "submissionDeadline",
  "unitsExisting",
  "unitsPlanned",
  "developerUnits",
  "lotAreaDunam",
  "shops",
  "planStatus",
  "planNumber",
  "signaturePct",
  "publicHousingPct",
  "registeredInMaagar",
  "sourceFee",
]);

const nnum = z.number().nullable();
const nstr = z.string().nullable();

/**
 * The editable subset of a Lead. Excludes identity (id/threadKey/createdAt),
 * computed (flags/grade/updatedAt), and the auto-managed provenance/extra maps.
 * `.partial()` — an edit may touch only some keys. Unknown keys are stripped here
 * (and routed to `extra` separately).
 */
const editableSchema = z
  .object({
    dealType: z.enum(values(DealType)),
    projectName: z.string(),
    city: nstr,
    address: nstr,
    gushHelka: z.array(z.string()),
    sourceType: z.enum(values(LeadSourceType)).nullable(),
    contact: z
      .object({
        name: nstr,
        company: nstr,
        firm: nstr,
        email: nstr,
        phone: nstr,
      })
      .nullable(),
    sourceFee: z
      .object({
        amount: nnum,
        currency: z.literal("ILS"),
        structure: z.enum(values(FeeStructure)),
        note: nstr,
      })
      .nullable(),
    status: z.enum(values(LeadStatus)),
    leadReceivedAt: z.string(),
    submissionDeadline: nstr,
    rejectionReason: z.enum(values(RejectionReason)).nullable(),
    notes: z.string(),
    unitsExisting: nnum,
    unitsPlanned: nnum,
    developerUnits: nnum,
    lotAreaDunam: nnum,
    shops: nnum,
    planStatus: z.enum(values(PlanStatus)),
    planNumber: nstr,
    signaturePct: nnum,
    publicHousingPct: nnum,
    registeredInMaagar: z.boolean().nullable(),
    sentToPlanningAt: nstr,
    planningResultAt: nstr,
    sentToArchitectAt: nstr,
    sentToEconomicsAt: nstr,
    offerAt: nstr,
    aiSummary: nstr,
  })
  .partial();

const KNOWN_LEAD_KEYS = new Set<string>([
  ...Object.keys(editableSchema.shape),
  ...SYSTEM_KEYS,
  ...COMPUTED_KEYS,
  "provenance",
  "extra",
]);

export interface AdvancedEditResult {
  /** Merged lead (pre re-grade). Identity forced, computed retained, extra merged. */
  lead: Lead;
  /** Editable fact keys the patch touched — stamped with manual provenance. */
  touchedFactKeys: LeadFactKey[];
  /** Unknown top-level keys the user added — routed into `extra`. */
  addedExtraKeys: string[];
}

/**
 * Merge a client-supplied JSON object onto the authoritative server lead, safely.
 * Throws a ZodError when an editable known field has the wrong type/enum.
 */
export function applyAdvancedPatch(
  serverLead: Lead,
  incoming: Record<string, unknown>,
): AdvancedEditResult {
  // 1. Validate the editable known fields (strips everything else).
  const known = editableSchema.parse(incoming) as Partial<Lead>;

  // 2. Unknown top-level keys → extra (this is how "add fields" works).
  const addedExtra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (!KNOWN_LEAD_KEYS.has(k)) addedExtra[k] = v;
  }

  // 3. Merge extra ONTO the server's extra so a partial patch never silently
  //    drops existing extra data; user-provided/added keys override; reserved
  //    keys are pinned to the server value so the editor can't break the pipeline.
  const userExtra =
    incoming.extra && typeof incoming.extra === "object" && !Array.isArray(incoming.extra)
      ? (incoming.extra as Record<string, unknown>)
      : {};
  const extra: Record<string, unknown> = { ...serverLead.extra, ...userExtra, ...addedExtra };
  for (const rk of RESERVED_EXTRA) {
    if (serverLead.extra[rk] !== undefined) extra[rk] = serverLead.extra[rk];
  }

  // 4. Rebuild from the server lead: apply known edits, force identity, keep
  //    computed (recomputeTriage overrides them), swap in the merged extra.
  const lead: Lead = {
    ...serverLead,
    ...known,
    id: serverLead.id,
    threadKey: serverLead.threadKey,
    createdAt: serverLead.createdAt,
    extra,
  };

  const touchedFactKeys = (Object.keys(known) as LeadFactKey[]).filter((k) => FACT_KEYS.has(k));

  return { lead, touchedFactKeys, addedExtraKeys: Object.keys(addedExtra) };
}

/** The lead as the advanced editor should show it — pretty JSON, computed fields last. */
export function toEditableJson(lead: Lead): string {
  return JSON.stringify(lead, null, 2);
}
