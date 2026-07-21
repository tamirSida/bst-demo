"use server";

/**
 * Server actions — the mutation entry points the dashboard UI calls. Each one
 * goes through the repo (Firestore or seed overlay), recomputes triage where
 * facts change, writes a timeline event, and revalidates the affected routes.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LeadStatus, type RejectionReason } from "@/lib/domain/enums";
import type { TriageConfig } from "@/lib/domain/config";
import { recomputeTriage } from "@/lib/domain/lead";
import { applyAdvancedPatch } from "@/lib/domain/leadEdit";
import type { Lead, LeadFactKey, TimelineEvent } from "@/lib/domain/types";
import {
  addTimelineEvent,
  deleteLead as deleteLeadRecord,
  getConfig,
  getLead,
  saveConfig,
  saveLead,
  updateLead,
} from "@/lib/firebase/repo";
import { YAZAM_QUESTIONS } from "@/lib/leads/yazamQuestions";

function id(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}`;
}

function timeline(
  leadId: string,
  kind: TimelineEvent["kind"],
  title: string,
): TimelineEvent {
  return { id: id(), leadId, at: new Date().toISOString(), kind, title };
}

function revalidateLead(leadId: string) {
  revalidatePath("/today");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

/** Provenance stamp for any human-entered value. */
const MANUAL_PROVENANCE = { origin: "manual", label: "עריכה ידנית" } as const;

/** Mark a lead inactive with a coded reason (powers the archive flywheel). */
export async function markInactive(leadId: string, reason: RejectionReason): Promise<void> {
  await updateLead(leadId, {
    status: LeadStatus.Closed,
    rejectionReason: reason,
  });
  await addTimelineEvent(timeline(leadId, "stage_change", "הליד סומן כלא פעיל"));
  revalidateLead(leadId);
}

/** Restore a closed lead back into active handling. */
export async function reopenLead(leadId: string): Promise<void> {
  await updateLead(leadId, { status: LeadStatus.Triage, rejectionReason: null });
  await addTimelineEvent(timeline(leadId, "stage_change", "הליד הוחזר לטיפול פעיל"));
  revalidateLead(leadId);
}

/** Permanently delete a lead and all its data. Irreversible — unlike markInactive. */
export async function deleteLead(leadId: string): Promise<void> {
  await deleteLeadRecord(leadId);
  revalidatePath("/today");
  revalidatePath("/leads");
  revalidatePath("/archive");
}

export type PromoteTarget = "planning" | "appraiser" | "questions";

export interface ActionOutcome {
  ok: boolean;
  /** Hebrew, user-facing — shown under the action bar. */
  message: string;
}

/** Move a lead forward in the pipeline (planning check / שמאי / more questions). */
export async function promoteLead(leadId: string, target: PromoteTarget): Promise<ActionOutcome> {
  const now = new Date().toISOString();

  if (target === "planning") {
    await updateLead(leadId, { status: LeadStatus.PlanningCheck, sentToPlanningAt: now });
    await addTimelineEvent(timeline(leadId, "email_out", "הליד הועבר לבדיקה תכנונית"));
    revalidateLead(leadId);
    return { ok: true, message: "הליד הועבר לשלב הבדיקה התכנונית ונרשם ביומן הפעילות." };
  }

  if (target === "appraiser") {
    await updateLead(leadId, { status: LeadStatus.EconomicCheck, sentToEconomicsAt: now });
    await addTimelineEvent(timeline(leadId, "email_out", "הליד הועבר לבדיקת שמאי (בדיקה כלכלית)"));
    revalidateLead(leadId);
    return { ok: true, message: "הליד הועבר לבדיקה כלכלית (שמאי) ונרשם ביומן הפעילות." };
  }

  // "שלח שאלות" — regenerate the gap questions with AI and send a fresh form.
  const { regenerateAndSendQuestions } = await import("@/lib/ingest/questions");
  const res = await regenerateAndSendQuestions(leadId);
  revalidateLead(leadId);

  switch (res.status) {
    case "sent":
      return {
        ok: true,
        message: `נשלח טופס עם ${res.questionCount} שאלות אל ${res.sentTo}.`,
      };
    case "simulated":
      return {
        ok: true,
        message: `נוצר טופס עם ${res.questionCount} שאלות (מצב דמו — המייל לא נשלח בפועל).`,
      };
    case "no_questions":
      return { ok: true, message: "אין שאלות פתוחות — כל המידע הדרוש כבר קיים." };
    case "no_contact":
      return {
        ok: false,
        message: "נוצר טופס, אך אין כתובת מייל לאיש הקשר. הוסיפו מייל בפרטי הליד ונסו שוב.",
      };
    default:
      return { ok: false, message: "שליחת השאלות נכשלה. נסו שוב או בדקו את חיבור המייל." };
  }
}

/**
 * Single write path for lead edits: read the authoritative lead, let the caller
 * build the patched lead, then re-grade (keeping only the AI duplicate flag),
 * persist, optionally log a timeline event, and revalidate. Both the inline fact
 * editor and the advanced JSON editor funnel through here.
 */
async function persistLeadEdit(
  leadId: string,
  build: (lead: Lead) => { patched: Lead; timelineTitle?: string },
): Promise<Lead | null> {
  const lead = await getLead(leadId);
  if (!lead) return null;
  const config = await getConfig();
  const { patched, timelineTitle } = build(lead);
  const keepFlags = lead.flags.filter((f) => f.id === "duplicate_lead");
  const regraded = recomputeTriage(patched, config, keepFlags);
  await saveLead(regraded);
  if (timelineTitle) await addTimelineEvent(timeline(leadId, "note", timelineTitle));
  revalidateLead(leadId);
  return regraded;
}

/** Inline-edit a single fact, then recompute flags + grade. */
export async function updateFact(
  leadId: string,
  field: LeadFactKey,
  value: string | number | boolean | null,
): Promise<void> {
  await persistLeadEdit(leadId, (lead) => {
    // gushHelka is stored as a list; the inline editor sends a comma-separated string.
    const coerced =
      field === "gushHelka" && typeof value === "string"
        ? value.split(",").map((s) => s.trim()).filter(Boolean)
        : value;
    const patched: Lead = { ...lead };
    (patched as unknown as Record<string, unknown>)[field] = coerced;
    patched.provenance = { ...lead.provenance, [field]: MANUAL_PROVENANCE };
    return { patched };
  });
}

/**
 * Advanced edit: apply a raw JSON object onto the lead. Identity + computed
 * fields are protected and unknown keys land in `lead.extra` (see leadEdit.ts).
 */
export async function updateLeadAdvanced(leadId: string, raw: unknown): Promise<ActionOutcome> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "מבנה JSON לא תקין — נדרש אובייקט." };
  }
  try {
    const result = await persistLeadEdit(leadId, (lead) => {
      const applied = applyAdvancedPatch(lead, raw as Record<string, unknown>);
      const provenance = { ...applied.lead.provenance };
      for (const key of applied.touchedFactKeys) {
        provenance[key] = MANUAL_PROVENANCE;
      }
      return { patched: { ...applied.lead, provenance }, timelineTitle: "הליד עודכן בעריכה מתקדמת" };
    });
    if (!result) return { ok: false, message: "הליד לא נמצא." };
    return { ok: true, message: "הליד עודכן ונוקד מחדש." };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return { ok: false, message: `שדה לא תקין: ${first.path.join(".") || "?"} — ${first.message}` };
    }
    return { ok: false, message: "העדכון נכשל. בדקו את מבנה ה-JSON." };
  }
}

/** Save edited triage thresholds from the settings screen. */
export async function saveConfigAction(config: TriageConfig): Promise<void> {
  await saveConfig(config);
  revalidatePath("/today");
  revalidatePath("/leads");
  revalidatePath("/settings");
}

/* -------------------------------- שאלון יזם ------------------------------- */

const yazamCompanyCount = YAZAM_QUESTIONS.filter((q) => q.scope === "company").length;
const yazamDealCount = YAZAM_QUESTIONS.length - yazamCompanyCount;

/** Persist per-lead שאלון יזם answers under lead.extra.yazam (merged, not replaced). */
async function writeYazam(
  lead: Lead,
  answers: Record<string, string>,
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(answers).map(([k, v]) => [k, (v ?? "").toString()]),
  );
  await updateLead(lead.id, {
    extra: { ...lead.extra, yazam: { answers: clean, updatedAt: new Date().toISOString() } },
  });
}

/**
 * Auto-prepare the שאלון יזם for a lead: snapshot BST's standing company answers
 * onto the lead (so they're the lead's own editable copy) and log the timeline.
 * Deal-specific questions stay empty for manual approval.
 */
export async function fillYazamAction(leadId: string): Promise<ActionOutcome> {
  const [lead, config] = await Promise.all([getLead(leadId), getConfig()]);
  if (!lead) return { ok: false, message: "הליד לא נמצא." };

  const answers: Record<string, string> = { ...(config.yazamAnswers ?? {}) };
  await writeYazam(lead, answers);

  const filled = YAZAM_QUESTIONS.filter(
    (q) => q.scope === "company" && answers[q.key]?.trim(),
  ).length;
  await addTimelineEvent(
    timeline(
      leadId,
      "note",
      `שאלון יזם מולא אוטומטית — ${filled}/${YAZAM_QUESTIONS.length} מולאו, ${yazamDealCount} לאישור`,
    ),
  );
  revalidateLead(leadId);
  return { ok: true, message: "שאלון היזם מולא ונרשם ביומן הפעילות." };
}

/** Save the user's edits to a lead's שאלון יזם and log the timeline. */
export async function saveYazamAction(
  leadId: string,
  answers: Record<string, string>,
): Promise<ActionOutcome> {
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, message: "הליד לא נמצא." };

  await writeYazam(lead, answers);
  await addTimelineEvent(timeline(leadId, "note", "שאלון יזם עודכן ידנית"));
  revalidateLead(leadId);
  return { ok: true, message: "שאלון היזם נשמר." };
}
