"use server";

/**
 * Server actions — the mutation entry points the dashboard UI calls. Each one
 * goes through the repo (Firestore or seed overlay), recomputes triage where
 * facts change, writes a timeline event, and revalidates the affected routes.
 */

import { revalidatePath } from "next/cache";
import { LeadStatus, type RejectionReason } from "@/lib/domain/enums";
import { recomputeTriage } from "@/lib/domain/lead";
import type { Lead, LeadFactKey, TimelineEvent } from "@/lib/domain/types";
import {
  addTimelineEvent,
  getConfig,
  getLead,
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

export type PromoteTarget = "planning" | "appraiser" | "questions";

/** Move a lead forward in the pipeline (planning check / שמאי / more questions). */
export async function promoteLead(leadId: string, target: PromoteTarget): Promise<void> {
  const now = new Date().toISOString();
  if (target === "planning") {
    await updateLead(leadId, { status: LeadStatus.PlanningCheck, sentToPlanningAt: now });
    await addTimelineEvent(timeline(leadId, "email_out", "הליד הועבר לבדיקה תכנונית"));
  } else if (target === "appraiser") {
    await updateLead(leadId, { status: LeadStatus.EconomicCheck, sentToEconomicsAt: now });
    await addTimelineEvent(timeline(leadId, "email_out", "הליד הועבר לבדיקת שמאי (בדיקה כלכלית)"));
  } else {
    await addTimelineEvent(timeline(leadId, "form_sent", "נשלחו שאלות השלמה נוספות לגורם הפונה"));
  }
  revalidateLead(leadId);
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
  (patched as unknown as Record<string, unknown>)[field] = value;
  patched.provenance = { ...lead.provenance, [field]: { origin: "manual", label: "עריכה ידנית" } };

  const keepFlags = lead.flags.filter((f) => f.id === "duplicate_lead");
  const regraded = recomputeTriage(patched, config, keepFlags);
  await saveLead(regraded);
  revalidateLead(leadId);
}
