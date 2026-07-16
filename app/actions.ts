"use server";

/**
 * Server actions — the mutation entry points the dashboard UI calls. Each one
 * goes through the repo (Firestore or seed overlay), recomputes triage where
 * facts change, writes a timeline event, and revalidates the affected routes.
 */

import { revalidatePath } from "next/cache";
import { LeadStatus, type RejectionReason } from "@/lib/domain/enums";
import type { TriageConfig } from "@/lib/domain/config";
import { recomputeTriage } from "@/lib/domain/lead";
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

/** Inline-edit a single fact, then recompute flags + grade. */
export async function updateFact(
  leadId: string,
  field: LeadFactKey,
  value: string | number | boolean | null,
): Promise<void> {
  const lead = await getLead(leadId);
  if (!lead) return;
  const config = await getConfig();

  const patched: Lead = { ...lead };
  // gushHelka is stored as a list; the inline editor sends a comma-separated string.
  const coerced =
    field === "gushHelka" && typeof value === "string"
      ? value.split(",").map((s) => s.trim()).filter(Boolean)
      : value;
  (patched as unknown as Record<string, unknown>)[field] = coerced;
  patched.provenance = { ...lead.provenance, [field]: { origin: "manual", label: "עריכה ידנית" } };

  const keepFlags = lead.flags.filter((f) => f.id === "duplicate_lead");
  const regraded = recomputeTriage(patched, config, keepFlags);
  await saveLead(regraded);
  revalidateLead(leadId);
}

/** Save edited triage thresholds from the settings screen. */
export async function saveConfigAction(config: TriageConfig): Promise<void> {
  await saveConfig(config);
  revalidatePath("/today");
  revalidatePath("/leads");
  revalidatePath("/settings");
}
