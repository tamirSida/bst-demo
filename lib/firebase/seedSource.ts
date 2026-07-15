/**
 * Read-only seed data source. When Firebase Admin isn't configured (local dev /
 * QA before creds are wired), the repo serves reads from the seed JSON files so
 * the whole UI renders with real data (749 leads + the הדרים lead). Once creds
 * are present the repo uses Firestore instead — same code paths, same shapes.
 */

import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONFIG } from "../domain/config";
import { createLead, recomputeTriage } from "../domain/lead";
import type { Lead, LeadForm, OutboundEmail, TimelineEvent } from "../domain/types";
import type { IngestResult } from "../ai/pipeline";

const SEED = resolve(process.cwd(), "data", "seed");

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(resolve(SEED, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

let leadsCache: Lead[] | null = null;
let hadarimCache: IngestResult | null = null;

// In-memory overlay so mutations reflect during a dev/demo session (lost on
// restart). Reads merge the overlay over the base seed.
const overlayLeads = new Map<string, Lead>();
const overlayForms = new Map<string, LeadForm>();
const overlayTimeline = new Map<string, TimelineEvent[]>();

function hadarim(): IngestResult | null {
  if (hadarimCache !== null) return hadarimCache;
  hadarimCache = readJson<IngestResult | null>("hadarim.json", null);
  return hadarimCache;
}

function baseLeads(): Lead[] {
  if (leadsCache) return leadsCache;
  const rows = readJson<Array<Partial<Lead> & { dealType: Lead["dealType"] }>>("leads.json", []);
  const leads = rows.map((row) => recomputeTriage(createLead(row as never), DEFAULT_CONFIG));
  const h = hadarim();
  if (h?.lead) leads.unshift(h.lead);
  leadsCache = leads;
  return leads;
}

/** All leads, hydrated + graded, with the in-memory overlay applied. */
export function seedLeads(): Lead[] {
  return baseLeads().map((l) => overlayLeads.get(l.id) ?? l);
}

export function seedLead(id: string): Lead | null {
  return overlayLeads.get(id) ?? baseLeads().find((l) => l.id === id) ?? null;
}

export function seedTimeline(leadId: string): TimelineEvent[] {
  const extra = overlayTimeline.get(leadId) ?? [];
  const h = hadarim();
  const base = h?.lead.id === leadId ? h.timeline : [];
  return [...extra, ...base].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

export function seedFormByToken(token: string): { form: LeadForm; lead: Lead } | null {
  for (const form of overlayForms.values()) {
    if (form.token === token) {
      const lead = seedLead(form.leadId);
      if (lead) return { form, lead };
    }
  }
  const h = hadarim();
  if (h?.form?.token === token) {
    return { form: overlayForms.get(h.form.id) ?? h.form, lead: seedLead(h.lead.id) ?? h.lead };
  }
  return null;
}

export function seedFormForLead(leadId: string): LeadForm | null {
  for (const form of overlayForms.values()) if (form.leadId === leadId) return form;
  const h = hadarim();
  return h?.form && h.lead.id === leadId ? overlayForms.get(h.form.id) ?? h.form : null;
}

export function seedOutbound(): OutboundEmail[] {
  const h = hadarim();
  return h?.outbound ? [h.outbound] : [];
}

/* ------------------------------- mutations ------------------------------ */

export function seedSaveLead(lead: Lead): void {
  overlayLeads.set(lead.id, lead);
}

export function seedSaveForm(form: LeadForm): void {
  overlayForms.set(form.id, form);
}

export function seedAddTimeline(evt: TimelineEvent): void {
  const list = overlayTimeline.get(evt.leadId) ?? [];
  list.unshift(evt);
  overlayTimeline.set(evt.leadId, list);
}
