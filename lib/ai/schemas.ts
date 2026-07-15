/**
 * Zod schemas for the AI structured-output calls. Enum members are derived from
 * the domain enums so the schema can never drift from the persisted values.
 */

import { z } from "zod";
import {
  DealType,
  DocType,
  FeeStructure,
  LeadSourceType,
  PlanStatus,
} from "../domain/enums";

const values = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [string, ...string[]];

/* ------------------------------- extraction ------------------------------- */

export const ExtractionSchema = z.object({
  dealType: z.enum(values(DealType)).nullable(),
  projectName: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  gushHelka: z.array(z.string()),
  sourceType: z.enum(values(LeadSourceType)).nullable(),
  contact: z
    .object({
      name: z.string().nullable(),
      firm: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
  submissionDeadline: z.string().nullable(), // ISO date, best effort
  unitsExisting: z.number().nullable(),
  unitsPlanned: z.number().nullable(),
  developerUnits: z.number().nullable(),
  lotAreaDunam: z.number().nullable(),
  shops: z.number().nullable(),
  planStatus: z.enum(values(PlanStatus)).nullable(),
  planNumber: z.string().nullable(),
  signaturePct: z.number().nullable(),
  publicHousingPct: z.number().nullable(),
  registeredInMaagar: z.boolean().nullable(),
  sourceFee: z
    .object({
      amount: z.number().nullable(),
      structure: z.enum(values(FeeStructure)),
      note: z.string().nullable(),
    })
    .nullable(),
  documents: z.array(
    z.object({
      fileName: z.string(),
      type: z.enum(values(DocType)),
    }),
  ),
  provenance: z.array(
    z.object({
      field: z.string(),
      label: z.string(),
      quote: z.string().nullable(),
      confidence: z.number().nullable(),
    }),
  ),
});
export type ExtractionResult = z.infer<typeof ExtractionSchema>;

/* ------------------------------- gap analysis ----------------------------- */

export const GapAnalysisSchema = z.object({
  needsMoreInfo: z.boolean(),
  questions: z.array(
    z.object({
      key: z.string(),
      fact: z.string().nullable(),
      label: z.string(),
      kind: z.enum([
        "number",
        "text",
        "longtext",
        "boolean",
        "percent",
        "currency",
        "date",
        "file",
        "select",
      ]),
      required: z.boolean(),
      options: z.array(z.string()).nullable(),
      unit: z.string().nullable(),
      help: z.string().nullable(),
      prefill: z.union([z.string(), z.number(), z.boolean()]).nullable(),
    }),
  ),
});
export type GapAnalysisResult = z.infer<typeof GapAnalysisSchema>;

/* ------------------------------- summary ---------------------------------- */

export const SummarySchema = z.object({
  summary: z.string(), // 3–5 Hebrew lines
});
export type SummaryResult = z.infer<typeof SummarySchema>;
