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
import { devStore } from "./devStore";
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

// EMPTY_START=true wipes the pre-loaded demo data (Excel + הדרים), so the app
// starts blank and only shows leads the pipeline creates — for demoing ingestion
// on a clean slate.
const seedDisabled = () => process.env.EMPTY_START === "true";

function hadarim(): IngestResult | null {
  if (seedDisabled()) return null;
  if (hadarimCache !== null) return hadarimCache;
  hadarimCache = readJson<IngestResult | null>("hadarim.json", null);
  return hadarimCache;
}

function baseLeads(): Lead[] {
  if (seedDisabled()) return [];
  if (leadsCache) return leadsCache;
  const rows = readJson<Array<Partial<Lead> & { dealType: Lead["dealType"] }>>("leads.json", []);
  const leads = rows.map((row) => recomputeTriage(createLead(row as never), DEFAULT_CONFIG));
  const h = hadarim();
  // Re-grade the הדרים lead against the current date so its deadline countdown
  // and flags stay live, while keeping its aiSummary / provenance / form intact.
  if (h?.lead) leads.unshift(recomputeTriage(h.lead, DEFAULT_CONFIG));
  leadsCache = leads;
  return leads;
}

/**
 * All leads: the base seed with the file overlay applied, PLUS overlay-only
 * leads (ones the pipeline created), newest first.
 */
export function seedLeads(): Lead[] {
  const overlay = devStore.allLeadOverlays();
  const base = baseLeads();
  const baseIds = new Set(base.map((l) => l.id));
  const merged = base.map((l) => overlay[l.id] ?? l);
  const created = Object.values(overlay).filter((l) => !baseIds.has(l.id));
  return [...created, ...merged];
}

export function seedLead(id: string): Lead | null {
  return devStore.leadOverlay(id) ?? baseLeads().find((l) => l.id === id) ?? null;
}

export function seedTimeline(leadId: string): TimelineEvent[] {
  const extra = devStore.timelineOverlay(leadId);
  const h = hadarim();
  const base = h?.lead.id === leadId ? h.timeline : [];
  return [...extra, ...base].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

function formById(id: string): LeadForm | undefined {
  return devStore.formOverlays().find((f) => f.id === id);
}

export function seedFormByToken(token: string): { form: LeadForm; lead: Lead } | null {
  for (const form of devStore.formOverlays()) {
    if (form.token === token) {
      const lead = seedLead(form.leadId);
      if (lead) return { form, lead };
    }
  }
  const h = hadarim();
  if (h?.form?.token === token) {
    return { form: formById(h.form.id) ?? h.form, lead: seedLead(h.lead.id) ?? h.lead };
  }
  return null;
}

export function seedFormForLead(leadId: string): LeadForm | null {
  for (const form of devStore.formOverlays()) if (form.leadId === leadId) return form;
  const h = hadarim();
  return h?.form && h.lead.id === leadId ? formById(h.form.id) ?? h.form : null;
}

export function seedOutbound(): OutboundEmail[] {
  const h = hadarim();
  const base = h?.outbound ? [h.outbound] : [];
  return [...devStore.outbound(), ...base];
}

export function seedAddOutbound(email: OutboundEmail): void {
  devStore.addOutbound(email);
}

/* ------------------------------- mutations ------------------------------ */

export function seedSaveLead(lead: Lead): void {
  devStore.setLead(lead);
}

export function seedSaveForm(form: LeadForm): void {
  devStore.setForm(form);
}

export function seedAddTimeline(evt: TimelineEvent): void {
  devStore.addTimeline(evt);
}
