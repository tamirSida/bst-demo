/**
 * File-backed dev overlay. Next.js dev runs route handlers and page renders in
 * separate module instances, so an in-memory Map isn't shared between a form
 * POST and the page that reads the result. A small JSON file IS shared (and
 * survives restarts), making the whole app interactive without Firebase.
 *
 * Only used in seed mode (no Firebase Admin creds). Never touched in production.
 */

import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Lead,
  LeadDocument,
  LeadForm,
  OutboundEmail,
  TimelineEvent,
} from "../domain/types";
import type { TriageConfig } from "../domain/config";

const FILE = resolve(process.cwd(), ".data", "dev-store.json");

interface DevStore {
  leads: Record<string, Lead>;
  forms: Record<string, LeadForm>;
  timeline: Record<string, TimelineEvent[]>;
  documents: Record<string, LeadDocument[]>;
  outbound: OutboundEmail[];
  config: TriageConfig | null;
}

const EMPTY: DevStore = {
  leads: {},
  forms: {},
  timeline: {},
  documents: {},
  outbound: [],
  config: null,
};

function load(): DevStore {
  try {
    if (!existsSync(FILE)) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(readFileSync(FILE, "utf8")) };
  } catch {
    return { ...EMPTY };
  }
}

function save(store: DevStore): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(store), "utf8");
}

export const devStore = {
  leadOverlay(id: string): Lead | undefined {
    return load().leads[id];
  },
  allLeadOverlays(): Record<string, Lead> {
    return load().leads;
  },
  setLead(lead: Lead): void {
    const s = load();
    s.leads[lead.id] = lead;
    save(s);
  },
  formOverlays(): LeadForm[] {
    return Object.values(load().forms);
  },
  setForm(form: LeadForm): void {
    const s = load();
    s.forms[form.id] = form;
    save(s);
  },
  timelineOverlay(leadId: string): TimelineEvent[] {
    return load().timeline[leadId] ?? [];
  },
  addTimeline(evt: TimelineEvent): void {
    const s = load();
    (s.timeline[evt.leadId] ??= []).unshift(evt);
    save(s);
  },
  documentsFor(leadId: string): LeadDocument[] {
    return load().documents[leadId] ?? [];
  },
  addDocument(doc: LeadDocument): void {
    const s = load();
    (s.documents[doc.leadId] ??= []).push(doc);
    save(s);
  },
  outbound(): OutboundEmail[] {
    return load().outbound;
  },
  addOutbound(email: OutboundEmail): void {
    const s = load();
    s.outbound.unshift(email);
    save(s);
  },
  config(): TriageConfig | null {
    return load().config;
  },
  setConfig(config: TriageConfig): void {
    const s = load();
    s.config = config;
    save(s);
  },
};
