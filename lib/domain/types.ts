/**
 * Entity types for the BST lead system.
 *
 * Design choice: Lead fields are FLAT plain values (numbers/strings/enums/null),
 * so the flags engine and grading operate on a clean data model with no wrapper
 * unwrapping. Provenance (where an AI-extracted value came from) lives in a
 * SEPARATE `provenance` map keyed by field name — data and metadata stay
 * decoupled. `null` always means "unknown / not yet extracted".
 */

import type {
  DealType,
  DocType,
  FeeStructure,
  FlagSeverity,
  LeadSourceType,
  LeadStatus,
  PlanStatus,
  RejectionReason,
  Verdict,
} from "./enums";

/* ------------------------------------------------------------------ */
/* Provenance — how we know a value (drives the UI source icons)       */
/* ------------------------------------------------------------------ */

export type ValueOrigin = "ai" | "manual" | "form" | "import" | "email";

export interface Provenance {
  origin: ValueOrigin;
  /** Human label of the source, e.g. "שאלון ליזמים, עמ' 1" or "מייל 07/05". */
  label: string;
  /** Exact quoted snippet the value was taken from, when available. */
  quote?: string;
  /** Model confidence 0–1 for AI-extracted values. */
  confidence?: number;
}

/** The Lead fields that carry provenance (extractable / editable facts). */
export type LeadFactKey =
  | "city"
  | "address"
  | "gushHelka"
  | "sourceType"
  | "submissionDeadline"
  | "unitsExisting"
  | "unitsPlanned"
  | "developerUnits"
  | "lotAreaDunam"
  | "shops"
  | "planStatus"
  | "planNumber"
  | "signaturePct"
  | "publicHousingPct"
  | "registeredInMaagar"
  | "sourceFee";

export type ProvenanceMap = Partial<Record<LeadFactKey, Provenance>>;

/* ------------------------------------------------------------------ */
/* Small value objects                                                 */
/* ------------------------------------------------------------------ */

export interface Contact {
  name: string | null;
  firm: string | null;
  email: string | null;
  phone: string | null;
}

/** What the referring party charges for the lead (feeds the final grade). */
export interface SourceFee {
  amount: number | null;
  currency: "ILS";
  structure: FeeStructure;
  /** Free-text detail, e.g. "2% מהתמורות" or "כלול בהסכם המארגנים". */
  note: string | null;
}

/* ------------------------------------------------------------------ */
/* Flags — produced by the deterministic engine                        */
/* ------------------------------------------------------------------ */

export interface Flag {
  /** Stable rule id, e.g. "below_legal_minimum". */
  id: string;
  severity: FlagSeverity;
  /** Short Hebrew chip label, e.g. "צפיפות 6.4". */
  title: string;
  /** Full Hebrew explanation with the actual values. */
  detail: string;
  /** The rule in plain Hebrew, e.g. "מינימום 24 יח"ד לפינוי-בינוי". */
  rule: string;
  /** Related fact, so the UI can deep-link to its source. */
  field?: LeadFactKey;
  /** Suggested cure action for red/curable flags. */
  cure?: string;
}

/* ------------------------------------------------------------------ */
/* Grading result                                                      */
/* ------------------------------------------------------------------ */

export interface GradeBreakdown {
  economics: number;
  planning: number;
  seriousness: number;
  strategic: number;
  timeline: number;
}

export interface Grade {
  /** 0–100 composite score (null when a kill flag fired). */
  score: number | null;
  verdict: Verdict;
  breakdown: GradeBreakdown;
  /** True once no red/kill flags remain — eligible for שמאי. */
  economicsReady: boolean;
}

/* ------------------------------------------------------------------ */
/* Lead — the central entity                                           */
/* ------------------------------------------------------------------ */

export interface Lead {
  id: string;
  dealType: DealType;

  /* Identity */
  projectName: string;
  city: string | null;
  address: string | null;
  gushHelka: string[];

  /* Source */
  sourceType: LeadSourceType | null;
  contact: Contact | null;
  sourceFee: SourceFee | null;

  /* Lifecycle */
  status: LeadStatus;
  leadReceivedAt: string; // ISO
  submissionDeadline: string | null; // ISO
  rejectionReason: RejectionReason | null;
  notes: string;

  /* Facts — pinui-binui / tama core (null = unknown) */
  unitsExisting: number | null;
  unitsPlanned: number | null;
  developerUnits: number | null;
  lotAreaDunam: number | null;
  shops: number | null;
  planStatus: PlanStatus;
  planNumber: string | null;
  signaturePct: number | null;
  publicHousingPct: number | null;
  registeredInMaagar: boolean | null;

  /* Workflow timestamps — mirror the Excel date columns (auto-stamped) */
  sentToPlanningAt: string | null;
  planningResultAt: string | null;
  sentToArchitectAt: string | null;
  sentToEconomicsAt: string | null;
  offerAt: string | null;

  /* Triage outputs (computed; persisted for display) */
  flags: Flag[];
  grade: Grade | null;
  aiSummary: string | null;

  /* Metadata */
  provenance: ProvenanceMap;
  /** Deal-type overflow (RAMI tender fields, etc.) kept loosely typed. */
  extra: Record<string, unknown>;
  /** Hidden thread marker embedded in outbound email, e.g. "BST-L-0042". */
  threadKey: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Forms — the "השלמת פרטים" flow                                       */
/* ------------------------------------------------------------------ */

export type QuestionKind =
  | "number"
  | "text"
  | "longtext"
  | "boolean"
  | "percent"
  | "currency"
  | "date"
  | "file"
  | "select";

export interface FormQuestion {
  /** Machine key; maps back onto a LeadFactKey when it fills a known fact. */
  key: string;
  /** Which lead fact this answer updates, if any. */
  fact?: LeadFactKey;
  label: string; // Hebrew question
  kind: QuestionKind;
  required: boolean;
  options?: string[]; // for select
  unit?: string; // e.g. "יח"ד", "₪", "מ"ר"
  help?: string; // Hebrew helper text
  /** Value we already believe, shown for confirmation. */
  prefill?: string | number | boolean | null;
}

export interface FileRef {
  fileName: string;
  storagePath: string;
  mime?: string;
  sizeBytes?: number;
}

export interface FormAnswer {
  value: string | number | boolean | null;
  files?: FileRef[];
}

export type FormStatus = "draft" | "sent" | "opened" | "submitted";

export interface LeadForm {
  id: string;
  leadId: string;
  token: string; // public, unguessable
  title: string; // Hebrew, e.g. "השלמת פרטים — הדרים 21-23, לוד"
  questions: FormQuestion[];
  answers: Record<string, FormAnswer>;
  status: FormStatus;
  createdAt: string;
  sentAt: string | null;
  openedAt: string | null;
  submittedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Timeline & documents (Lead subcollections)                          */
/* ------------------------------------------------------------------ */

export type TimelineKind =
  | "created"
  | "email_in"
  | "email_out"
  | "stage_change"
  | "note"
  | "doc_received"
  | "form_sent"
  | "form_opened"
  | "form_submitted"
  | "grade_change";

export interface TimelineEvent {
  id: string;
  leadId: string;
  at: string; // ISO
  kind: TimelineKind;
  title: string; // Hebrew
  body?: string;
  meta?: Record<string, unknown>;
}

export interface LeadDocument {
  id: string;
  leadId: string;
  type: DocType;
  fileName: string;
  storagePath: string | null;
  mime: string | null;
  sizeBytes: number | null;
  receivedAt: string;
  /** Structured parse of a questionnaire's chapters/demands, when applicable. */
  parsed?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Outbound email audit                                                */
/* ------------------------------------------------------------------ */

export interface OutboundEmail {
  id: string;
  leadId: string | null;
  to: string;
  subject: string;
  templateKey: string;
  body: string;
  /** In the demo, sends are simulated → "simulated". Live → "sent"/"failed". */
  status: "simulated" | "sent" | "failed";
  providerId: string | null;
  at: string;
}
