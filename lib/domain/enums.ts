/**
 * Core domain enumerations for the BST urban-renewal lead system.
 *
 * Pattern: each enum is a frozen value object + a derived string-literal type,
 * paired with a Hebrew label map for display. Stable machine keys never change;
 * only the label maps are user-facing. This keeps persistence/logic decoupled
 * from presentation (single source of truth for every label).
 */

/* ------------------------------------------------------------------ */
/* Deal type — mirrors the 5 sheets of פיתוח עסקי.xlsx                 */
/* ------------------------------------------------------------------ */

export const DealType = {
  PinuiBinui: "pinui_binui",
  Tama38: "tama_38_2",
  Initiative: "initiative",
  RamiTender: "rami_tender",
  ExternalOffer: "external_offer",
} as const;
export type DealType = (typeof DealType)[keyof typeof DealType];

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  [DealType.PinuiBinui]: 'פינוי בינוי',
  [DealType.Tama38]: 'תמ"א 38/2 (הריסה ובנייה)',
  [DealType.Initiative]: "יזמות",
  [DealType.RamiTender]: 'מכרז רמ"י',
  [DealType.ExternalOffer]: "הצעה בחוץ",
};

/* ------------------------------------------------------------------ */
/* Planning status — what the architect/מנהלת check on mavat            */
/* ------------------------------------------------------------------ */

export const PlanStatus = {
  ApprovedMitcham: "approved_mitcham",
  Deposited: "deposited",
  EarlyProcess: "early_process",
  PolicyNoPlan: "policy_no_plan",
  NoPolicy: "no_policy",
  ConflictsPolicy: "conflicts_policy",
  Unknown: "unknown",
} as const;
export type PlanStatus = (typeof PlanStatus)[keyof typeof PlanStatus];

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  [PlanStatus.ApprovedMitcham]: 'תב"ע מאושרת למתחם',
  [PlanStatus.Deposited]: 'תב"ע בהפקדה',
  [PlanStatus.EarlyProcess]: 'תב"ע בהליכים מוקדמים',
  [PlanStatus.PolicyNoPlan]: "אין תכנית, קיימת מדיניות",
  [PlanStatus.NoPolicy]: "אין תכנית ואין מדיניות",
  [PlanStatus.ConflictsPolicy]: "בסתירה למדיניות העירונית",
  [PlanStatus.Unknown]: "טרם נבדק",
};

/* ------------------------------------------------------------------ */
/* Lead pipeline status — the state machine encoded by the Excel dates */
/* ------------------------------------------------------------------ */

export const LeadStatus = {
  New: "new",
  Triage: "triage",
  AwaitingInfo: "awaiting_info",
  PlanningCheck: "planning_check",
  Questionnaire: "questionnaire",
  EconomicCheck: "economic_check",
  OfferSubmitted: "offer_submitted",
  Closed: "closed",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.New]: "חדש",
  [LeadStatus.Triage]: "בבדיקה ראשונית",
  [LeadStatus.AwaitingInfo]: "ממתין להשלמת פרטים",
  [LeadStatus.PlanningCheck]: "בבדיקה תכנונית",
  [LeadStatus.Questionnaire]: 'שאלון ומו"מ',
  [LeadStatus.EconomicCheck]: "בבדיקה כלכלית (שמאי)",
  [LeadStatus.OfferSubmitted]: "הוגשה הצעה",
  [LeadStatus.Closed]: "לא פעיל",
};

/** Ordered stages for the pipeline / kanban view. */
export const PIPELINE_ORDER: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Triage,
  LeadStatus.PlanningCheck,
  LeadStatus.Questionnaire,
  LeadStatus.EconomicCheck,
  LeadStatus.OfferSubmitted,
  LeadStatus.Closed,
];

/* ------------------------------------------------------------------ */
/* Lead source — who referred the deal (drives the source-fee logic)   */
/* ------------------------------------------------------------------ */

export const LeadSourceType = {
  TenantLawyer: "tenant_lawyer",
  Organizer: "organizer",
  Broker: "broker",
  Municipality: "municipality",
  RamiPublication: "rami_publication",
  Other: "other",
} as const;
export type LeadSourceType = (typeof LeadSourceType)[keyof typeof LeadSourceType];

export const LEAD_SOURCE_LABEL: Record<LeadSourceType, string> = {
  [LeadSourceType.TenantLawyer]: 'עו"ד הדיירים',
  [LeadSourceType.Organizer]: "מארגן",
  [LeadSourceType.Broker]: "מתווך",
  [LeadSourceType.Municipality]: "מנהלת עירונית",
  [LeadSourceType.RamiPublication]: 'פרסום רמ"י',
  [LeadSourceType.Other]: "אחר",
};

/* ------------------------------------------------------------------ */
/* Flag severity — the traffic-light system                            */
/* ------------------------------------------------------------------ */

export const FlagSeverity = {
  Kill: "kill",
  Red: "red",
  Yellow: "yellow",
  Green: "green",
  Info: "info",
} as const;
export type FlagSeverity = (typeof FlagSeverity)[keyof typeof FlagSeverity];

export const FLAG_SEVERITY_LABEL: Record<FlagSeverity, string> = {
  [FlagSeverity.Kill]: "קטלני",
  [FlagSeverity.Red]: "חוסם",
  [FlagSeverity.Yellow]: "לתשומת לב",
  [FlagSeverity.Green]: "חיובי",
  [FlagSeverity.Info]: "מידע",
};

/* ------------------------------------------------------------------ */
/* Triage verdict — the bottom-line recommendation                     */
/* ------------------------------------------------------------------ */

export const Verdict = {
  Advance: "advance",
  Review: "review",
  Reject: "reject",
  Killed: "killed",
  Curable: "curable",
} as const;
export type Verdict = (typeof Verdict)[keyof typeof Verdict];

export const VERDICT_LABEL: Record<Verdict, string> = {
  [Verdict.Advance]: "מומלץ להתקדם",
  [Verdict.Review]: "להחלטת הנהלה",
  [Verdict.Reject]: "מומלץ לדחות",
  [Verdict.Killed]: "נפסל",
  [Verdict.Curable]: "ניתן לריפוי",
};

/* ------------------------------------------------------------------ */
/* Rejection reasons — coded taxonomy powering the archive flywheel     */
/* ------------------------------------------------------------------ */

export const RejectionReason = {
  EconomicsMultiplier: "economics_multiplier",
  EconomicsAreaPrice: "economics_area_price",
  SourceFeeTooHigh: "source_fee_too_high",
  PlanningNoPath: "planning_no_path",
  Timeline: "timeline",
  NotRegistered: "not_registered",
  Guarantees: "guarantees",
  Strategic: "strategic",
  UnseriousTenants: "unserious_tenants",
  LostTender: "lost_tender",
  Duplicate: "duplicate",
  Other: "other",
} as const;
export type RejectionReason = (typeof RejectionReason)[keyof typeof RejectionReason];

export const REJECTION_REASON_LABEL: Record<RejectionReason, string> = {
  [RejectionReason.EconomicsMultiplier]: "מכפיל נמוך מדי",
  [RejectionReason.EconomicsAreaPrice]: "מחירי אזור נמוכים",
  [RejectionReason.SourceFeeTooHigh]: "עמלת מקור גבוהה מדי",
  [RejectionReason.PlanningNoPath]: "אין מסלול תכנוני",
  [RejectionReason.Timeline]: "לוח זמנים לא ריאלי",
  [RejectionReason.NotRegistered]: "לא במאגר היזמים",
  [RejectionReason.Guarantees]: "דרישות ערבויות חריגות",
  [RejectionReason.Strategic]: "לא מתאים אסטרטגית",
  [RejectionReason.UnseriousTenants]: "דיירים / פנייה לא רציניים",
  [RejectionReason.LostTender]: "הפסד במכרז",
  [RejectionReason.Duplicate]: "כפילות",
  [RejectionReason.Other]: "אחר",
};

/* ------------------------------------------------------------------ */
/* Document types — attachment taxonomy                                */
/* ------------------------------------------------------------------ */

export const DocType = {
  Invitation: "invitation",
  Questionnaire: "questionnaire",
  QuestionnaireSupplement: "questionnaire_supplement",
  Agreement: "agreement",
  LandRegistry: "land_registry",
  Blueprint: "blueprint",
  Policy: "policy",
  OrganizersAgreement: "organizers_agreement",
  Other: "other",
} as const;
export type DocType = (typeof DocType)[keyof typeof DocType];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  [DocType.Invitation]: "הזמנה להציע הצעות",
  [DocType.Questionnaire]: "שאלון ליזמים",
  [DocType.QuestionnaireSupplement]: "שאלון השלמה",
  [DocType.Agreement]: "טיוטת הסכם",
  [DocType.LandRegistry]: "נסח טאבו",
  [DocType.Blueprint]: "תשריט",
  [DocType.Policy]: "מסמך מדיניות",
  [DocType.OrganizersAgreement]: "הסכם מארגנים",
  [DocType.Other]: "אחר",
};

/* ------------------------------------------------------------------ */
/* Source-fee structure — how the referrer charges                     */
/* ------------------------------------------------------------------ */

export const FeeStructure = {
  PerUnit: "per_unit",
  Percentage: "percentage",
  Fixed: "fixed",
  Unknown: "unknown",
} as const;
export type FeeStructure = (typeof FeeStructure)[keyof typeof FeeStructure];

export const FEE_STRUCTURE_LABEL: Record<FeeStructure, string> = {
  [FeeStructure.PerUnit]: 'לפי יח"ד',
  [FeeStructure.Percentage]: "אחוז מהעסקה",
  [FeeStructure.Fixed]: "סכום קבוע",
  [FeeStructure.Unknown]: "לא ידוע",
};
