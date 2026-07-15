/**
 * The ingestion pipeline: parsed email → triaged lead (+ form + outbound draft).
 *
 * Orchestration only — each step lives in its own module. Firestore is inverted
 * behind the optional `findDuplicate` dependency, so the pipeline is pure enough
 * to run in a seed script, an API route, or a test with a fake repo.
 */

import { DealType, type FeeStructure, FlagSeverity, LeadStatus, PlanStatus } from "../domain/enums";
import type { TriageConfig } from "../domain/config";
import { createLead, displayName, nextThreadKey, recomputeTriage } from "../domain/lead";
import type {
  Flag,
  Lead,
  LeadForm,
  OutboundEmail,
  ProvenanceMap,
  TimelineEvent,
} from "../domain/types";
import type { ParsedEmail } from "../eml/parse";
import { extractLead } from "./extract";
import { analyzeGaps } from "./gaps";
import { summarizeLead } from "./summary";
import type { ExtractionResult } from "./schemas";

export interface DuplicateHit {
  id: string;
  projectName: string;
  rejectionReasonLabel: string | null;
  receivedAt: string | null;
}

export interface IngestDeps {
  config: TriageConfig;
  /** Look up a prior lead for the same site (archive flywheel). Optional. */
  findDuplicate?: (lead: Lead) => Promise<DuplicateHit | null>;
  /** Explicit thread sequence for stable seed ids. */
  threadSeq?: number;
  /** Base URL for the public form, e.g. "https://app/f/". */
  formBaseUrl?: string;
  /** Skip the AI summary (faster tests). */
  skipSummary?: boolean;
}

export interface IngestResult {
  lead: Lead;
  form: LeadForm | null;
  outbound: OutboundEmail | null;
  timeline: TimelineEvent[];
  documents: { fileName: string; type: string }[];
  duplicate: DuplicateHit | null;
}

export async function runIngestPipeline(
  email: ParsedEmail,
  deps: IngestDeps,
): Promise<IngestResult> {
  const extraction = await extractLead(email);
  return assembleFromExtraction(email, extraction, deps);
}

/** Shared by the live pipeline and the seed script (which caches extractions). */
export async function assembleFromExtraction(
  email: ParsedEmail,
  extraction: ExtractionResult,
  deps: IngestDeps,
): Promise<IngestResult> {
  const { config } = deps;
  const threadKey = nextThreadKey(deps.threadSeq);

  const documentTypes = extraction.documents.map((d) => d.type);
  const lead0 = createLead({
    dealType: (extraction.dealType as DealType) ?? DealType.PinuiBinui,
    projectName: extraction.projectName ?? email.subject ?? "ליד חדש",
    city: extraction.city,
    address: extraction.address,
    gushHelka: extraction.gushHelka,
    sourceType: extraction.sourceType as Lead["sourceType"],
    contact: extraction.contact ?? contactFromEmail(email),
    submissionDeadline: extraction.submissionDeadline,
    unitsExisting: extraction.unitsExisting,
    unitsPlanned: extraction.unitsPlanned,
    developerUnits: extraction.developerUnits,
    lotAreaDunam: extraction.lotAreaDunam,
    shops: extraction.shops,
    planStatus: (extraction.planStatus as PlanStatus) ?? PlanStatus.Unknown,
    planNumber: extraction.planNumber,
    signaturePct: extraction.signaturePct,
    publicHousingPct: extraction.publicHousingPct,
    registeredInMaagar: extraction.registeredInMaagar,
    sourceFee: extraction.sourceFee
      ? {
          amount: extraction.sourceFee.amount,
          currency: "ILS",
          structure: extraction.sourceFee.structure as FeeStructure,
          note: extraction.sourceFee.note,
        }
      : null,
    leadReceivedAt: email.date ?? new Date().toISOString(),
    status: LeadStatus.Triage,
    provenance: provenanceFromExtraction(extraction),
    extra: { documentTypes, threadKey },
    threadKey,
  });

  // Duplicate detection (archive flywheel) — injected, may add a flag.
  const duplicate = deps.findDuplicate ? await deps.findDuplicate(lead0) : null;
  const extraFlags: Flag[] = duplicate
    ? [
        {
          id: "duplicate_lead",
          severity: FlagSeverity.Yellow,
          title: "מתחם מוכר מהארכיון",
          detail: duplicate.rejectionReasonLabel
            ? `מתחם זה כבר נבדק בעבר ונפסל: «${duplicate.rejectionReasonLabel}».`
            : "מתחם זה כבר הופיע במערכת בעבר.",
          rule: "כפילות מול הארכיון",
          cure: "לבחון את ההיסטוריה לפני המשך טיפול",
        },
      ]
    : [];

  let lead = recomputeTriage(lead0, config, extraFlags);

  const timeline: TimelineEvent[] = [
    event(lead.id, "created", "הליד נוצר מהמייל הנכנס", {
      from: email.fromEmail,
      subject: email.subject,
    }),
  ];
  // Log doc-received events only for attachments that are actually stored as
  // documents (email.documents), so the timeline count matches the panel.
  const storedNames = new Set(email.documents.map((d) => d.filename));
  for (const doc of extraction.documents) {
    if (!storedNames.has(doc.fileName)) continue;
    timeline.push(event(lead.id, "doc_received", `התקבל מסמך: ${doc.fileName}`, { type: doc.type }));
  }

  // Killed leads: no form, no outbound. Everything else may get a form.
  const killed = lead.grade?.verdict === "killed";

  let form: LeadForm | null = null;
  let outbound: OutboundEmail | null = null;

  if (!killed) {
    const questions = await analyzeGaps(lead);
    if (questions.length > 0) {
      const token = makeToken();
      const now = new Date().toISOString();
      form = {
        id: makeToken(),
        leadId: lead.id,
        token,
        title: `השלמת פרטים — ${displayName(lead)}`,
        questions,
        answers: {},
        status: "sent",
        createdAt: now,
        sentAt: now,
        openedAt: null,
        submittedAt: null,
      };
      lead = { ...lead, status: LeadStatus.AwaitingInfo };
      outbound = buildFormEmail(lead, form, deps.formBaseUrl);
      timeline.push(event(lead.id, "form_sent", "נשלח טופס השלמת פרטים לגורם הפונה"));
    }
  }

  if (!deps.skipSummary) {
    try {
      lead = { ...lead, aiSummary: await summarizeLead(lead) };
    } catch {
      // Summary is best-effort; never fail ingestion over it.
    }
  }

  return {
    lead,
    form,
    outbound,
    timeline,
    documents: extraction.documents,
    duplicate,
  };
}

/* ------------------------------- helpers -------------------------------- */

function provenanceFromExtraction(extraction: ExtractionResult): ProvenanceMap {
  const map: ProvenanceMap = {};
  for (const p of extraction.provenance) {
    const key = p.field as keyof ProvenanceMap;
    map[key] = {
      origin: "ai",
      label: p.label,
      quote: p.quote ?? undefined,
      confidence: p.confidence ?? undefined,
    };
  }
  return map;
}

function contactFromEmail(email: ParsedEmail): Lead["contact"] {
  if (!email.fromEmail && !email.fromName) return null;
  return { name: email.fromName, firm: null, email: email.fromEmail, phone: null };
}

function buildFormEmail(lead: Lead, form: LeadForm, base?: string): OutboundEmail {
  const url = `${base ?? "/f/"}${form.token}`;
  const body = [
    "שלום רב,",
    "",
    `תודה על פנייתכם בנוגע לפרויקט «${lead.projectName}»${lead.city ? ` ב${lead.city}` : ""}.`,
    "לצורך בחינה מהירה ומדויקת, נודה להשלמת מספר פרטים קצרים בקישור הבא:",
    "",
    url,
    "",
    "הפרטים שכבר בידינו מופיעים בטופס לאישורכם — יש למלא רק את החסר.",
    "",
    `[${lead.threadKey}]`,
    "",
    "בברכה,",
    "צוות הפיתוח העסקי — קבוצת BST",
  ].join("\n");

  return {
    id: makeToken(),
    leadId: lead.id,
    to: lead.contact?.email ?? "",
    subject: `השלמת פרטים — ${lead.projectName} [${lead.threadKey}]`,
    templateKey: "form_request",
    body,
    status: "simulated",
    providerId: null,
    at: new Date().toISOString(),
  };
}

function event(
  leadId: string,
  kind: TimelineEvent["kind"],
  title: string,
  meta?: Record<string, unknown>,
): TimelineEvent {
  return { id: makeToken(), leadId, at: new Date().toISOString(), kind, title, meta };
}

function makeToken(): string {
  return (
    globalThis.crypto?.randomUUID?.().replace(/-/g, "") ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}
