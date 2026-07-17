/**
 * Zod schemas for the AI structured-output calls. Enum members are derived from
 * the domain enums so the schema can never drift from the persisted values.
 */

import { z } from "zod";
import { DealType, FeeStructure, LeadSourceType, PlanStatus } from "../domain/enums";

const values = <T extends Record<string, string>>(e: T) =>
  Object.values(e) as [string, ...string[]];

/* ------------------------------- extraction ------------------------------- */

/**
 * The strict shape the pipeline consumes. We do NOT ask the model for this
 * directly — the extraction schema exceeds the API union limit, so the model
 * returns free JSON that we parse permissively (RawExtractionSchema) and then
 * normalize to this shape, coercing enums and fixing common structural drift
 * (e.g. provenance returned as an object instead of an array).
 */
export interface ExtractionResult {
  dealType: string | null;
  projectName: string | null;
  city: string | null;
  address: string | null;
  gushHelka: string[];
  sourceType: string | null;
  contact: {
    name: string | null;
    company: string | null;
    firm: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  submissionDeadline: string | null;
  unitsExisting: number | null;
  unitsPlanned: number | null;
  developerUnits: number | null;
  lotAreaDunam: number | null;
  shops: number | null;
  planStatus: string | null;
  planNumber: string | null;
  signaturePct: number | null;
  publicHousingPct: number | null;
  registeredInMaagar: boolean | null;
  sourceFee: { amount: number | null; structure: string; note: string | null } | null;
  documents: { fileName: string; type: string }[];
  provenance: { field: string; label: string; quote: string | null; confidence: number | null }[];
}

/**
 * Fully tolerant raw parse. Sonnet 4.6's structured-output (`output_config.format`)
 * compiler rejects even simple 25-field schemas as "too complex", so extraction
 * uses free-JSON mode instead. We accept ANY object shape and do all coercion in
 * normalizeExtraction — bulletproof against model drift (objects for strings,
 * numbers as text, enums off-list, etc.).
 */
export const RawExtractionSchema = z.record(z.string(), z.unknown());
type RawExtraction = z.infer<typeof RawExtractionSchema>;

const blank = (v: unknown): string | null => {
  const s = toStr(v);
  return s && s.trim() ? s : null;
};

function toStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const vals = Object.values(v as Record<string, unknown>).filter((x) => x != null && x !== "");
    return vals.length ? vals.map((x) => toStr(x)).filter(Boolean).join(" ") : null;
  }
  return null;
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (/^(true|כן|yes|רשום)/i.test(v)) return true;
    if (/^(false|לא|no)/i.test(v)) return false;
  }
  return null;
}

const coerce = (v: unknown, allowed: readonly string[], fallback: string | null) =>
  typeof v === "string" && allowed.includes(v) ? v : fallback;

/** Coerce the tolerant parse into the strict ExtractionResult. */
export function normalizeExtraction(
  raw: RawExtraction,
  documents: ExtractionResult["documents"] = [],
): ExtractionResult {
  const get = (k: string) => raw[k];
  const contact = (get("contact") as Record<string, unknown>) ?? {};
  const name = blank(get("contactName") ?? contact.name);
  const company = blank(get("contactCompany") ?? contact.company);
  const firm = blank(get("contactFirm") ?? contact.firm);
  const email = blank(get("contactEmail") ?? contact.email);
  const phone = blank(get("contactPhone") ?? contact.phone);
  const hasContact = Boolean(name || email || phone || firm || company);

  const fee = (get("sourceFee") as Record<string, unknown>) ?? {};
  const feeAmount = toNum(get("feeAmount") ?? fee.amount);
  const feeNote = blank(get("feeNote") ?? fee.note);
  const feeStructure = coerce(get("feeStructure") ?? fee.structure, values(FeeStructure), "unknown")!;
  const hasFee = feeAmount != null || feeNote != null;

  const gush = get("gushHelka");
  const gushHelka = Array.isArray(gush)
    ? gush.map((g) => toStr(g)).filter((g): g is string => !!g && g.trim().length > 0)
    : blank(gush)
      ? [blank(gush)!]
      : [];

  const srcLabel = blank(get("sourceNote")) ?? "חולץ אוטומטית מהמסמכים";
  const provenance: ExtractionResult["provenance"] = [];
  const markProv = (field: string, present: unknown) => {
    if (present !== null && present !== undefined && present !== "") {
      provenance.push({ field, label: srcLabel, quote: null, confidence: null });
    }
  };

  const unitsExisting = toNum(get("unitsExisting"));
  const unitsPlanned = toNum(get("unitsPlanned"));
  const lotAreaDunam = toNum(get("lotAreaDunam"));
  const planStatus = coerce(get("planStatus"), values(PlanStatus), null);
  const planNumber = blank(get("planNumber"));
  const signaturePct = toNum(get("signaturePct"));

  markProv("unitsExisting", unitsExisting);
  markProv("unitsPlanned", unitsPlanned);
  markProv("lotAreaDunam", lotAreaDunam);
  markProv("planStatus", planStatus);
  markProv("planNumber", planNumber);
  markProv("signaturePct", signaturePct);
  if (hasFee) markProv("sourceFee", "y");

  return {
    dealType: coerce(get("dealType"), values(DealType), null),
    projectName: blank(get("projectName")),
    city: blank(get("city")),
    address: blank(get("address")),
    gushHelka,
    sourceType: coerce(get("sourceType"), values(LeadSourceType), null),
    contact: hasContact ? { name, company, firm, email, phone } : null,
    submissionDeadline: blank(get("submissionDeadline")),
    unitsExisting,
    unitsPlanned,
    developerUnits: toNum(get("developerUnits")),
    lotAreaDunam,
    shops: toNum(get("shops")),
    planStatus,
    planNumber,
    signaturePct,
    publicHousingPct: toNum(get("publicHousingPct")),
    registeredInMaagar: toBool(get("registeredInMaagar")),
    sourceFee: hasFee ? { amount: feeAmount, structure: feeStructure, note: feeNote } : null,
    documents,
    provenance,
  };
}

/* ------------------------------- gap analysis ----------------------------- */

export const GapAnalysisSchema = z.object({
  needsMoreInfo: z.boolean(),
  questions: z.array(
    z.object({
      key: z.string(),
      fact: z.string().optional(),
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
      options: z.array(z.string()).optional(),
      unit: z.string().optional(),
      help: z.string().optional(),
      prefillText: z.string().optional(),
    }),
  ),
});
export type GapAnalysisResult = z.infer<typeof GapAnalysisSchema>;

/* ------------------------------- summary ---------------------------------- */

export const SummarySchema = z.object({
  summary: z.string(), // 3–5 Hebrew lines
});
export type SummaryResult = z.infer<typeof SummarySchema>;
