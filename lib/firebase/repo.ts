/**
 * Firestore repository — the single data-access layer. Every screen and API
 * route depends on these functions, never on Firestore directly, so the storage
 * shape lives in one place.
 *
 * Scale note: the whole book is ~750 leads, so list/search/dedup fetch-and-filter
 * in memory rather than maintaining composite indexes — deliberate for the demo.
 */

import "server-only";
import { adminDb, isAdminConfigured } from "./admin";
import { createLeadsCache } from "./leadsCache";
import {
  seedAddTimeline,
  seedDeleteLead,
  seedFormByToken,
  seedFormForLead,
  seedLead,
  seedLeads,
  seedAddOutbound,
  seedOutbound,
  seedSaveForm,
  seedSaveLead,
  seedTimeline,
} from "./seedSource";
import { devStore } from "./devStore";
import { deleteLeadFiles } from "../storage/files";
import { DEFAULT_CONFIG, type TriageConfig } from "../domain/config";
import { LeadStatus, REJECTION_REASON_LABEL } from "../domain/enums";
import { recomputeTriage } from "../domain/lead";
import type {
  Lead,
  LeadDocument,
  LeadForm,
  OutboundEmail,
  TimelineEvent,
} from "../domain/types";
import type { DuplicateHit } from "../ai/pipeline";

/** True when we should read from the seed JSON instead of Firestore. */
const fromSeed = () => !isAdminConfigured();

const LEADS = "leads";
const FORMS = "forms";
const OUTBOUND = "outbound";
const CONFIG_DOC = "config/thresholds";

/**
 * The full-book cache. Every leads read goes through it, so the whole
 * collection is fetched at most once per TTL window instead of on every call.
 * Each real Firestore fetch is logged with a running doc-read tally so we can
 * watch read volume and confirm we stay well inside the free-tier daily quota.
 */
let leadDocReads = 0;
let leadFetches = 0;
const leadsCache = createLeadsCache(async () => {
  const snap = await adminDb().collection(LEADS).get();
  leadFetches += 1;
  leadDocReads += snap.size;
  console.log(
    `[firestore] leads full-read #${leadFetches}: ${snap.size} docs · session total ${leadDocReads}`,
  );
  return snap.docs.map((d) => d.data() as Lead);
});

/** Read-volume telemetry — watch this to confirm we stay under the daily quota. */
export function leadReadStats(): { leadFetches: number; leadDocReads: number } {
  return { leadFetches, leadDocReads };
}

/** A lead came in through email or manual upload (vs. seeded/demo data). */
const isUploaded = (l: Lead): boolean => {
  const origin = (l.extra as { origin?: unknown } | undefined)?.origin;
  return origin === "email" || origin === "manual";
};

/** Firestore rejects `undefined`; deep-strip before every write. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

/* ------------------------------- config --------------------------------- */

export async function getConfig(): Promise<TriageConfig> {
  if (fromSeed()) return devStore.config() ?? DEFAULT_CONFIG;
  const snap = await adminDb().doc(CONFIG_DOC).get();
  if (!snap.exists) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...(snap.data() as Partial<TriageConfig>) };
}

export async function saveConfig(config: TriageConfig): Promise<void> {
  if (fromSeed()) return devStore.setConfig(config);
  await adminDb().doc(CONFIG_DOC).set(clean(config));
}

/* -------------------------------- leads --------------------------------- */

export interface LeadFilter {
  activeOnly?: boolean;
  dealType?: string;
  city?: string;
  status?: string;
  search?: string;
  /** Exclude seeded/demo leads — show only email/upload leads. */
  uploadedOnly?: boolean;
}

const isActive = (l: Lead) => l.status !== LeadStatus.Closed;

export async function listLeads(filter: LeadFilter = {}): Promise<Lead[]> {
  let leads: Lead[];
  if (fromSeed()) {
    leads = seedLeads();
  } else {
    leads = await leadsCache.getAll();
  }

  if (filter.activeOnly) leads = leads.filter(isActive);
  if (filter.uploadedOnly) leads = leads.filter(isUploaded);
  if (filter.dealType) leads = leads.filter((l) => l.dealType === filter.dealType);
  if (filter.city) leads = leads.filter((l) => l.city === filter.city);
  if (filter.status) leads = leads.filter((l) => l.status === filter.status);
  if (filter.search) {
    const q = filter.search.trim();
    leads = leads.filter((l) =>
      [l.projectName, l.city, l.address, ...l.gushHelka, l.contact?.name]
        .filter(Boolean)
        .some((s) => (s as string).includes(q)),
    );
  }
  // Copy before sorting: `leads` may still alias the shared cache array here.
  return leads.slice().sort((a, b) => (b.leadReceivedAt ?? "").localeCompare(a.leadReceivedAt ?? ""));
}

export async function getLead(id: string): Promise<Lead | null> {
  if (fromSeed()) return seedLead(id);
  const snap = await adminDb().collection(LEADS).doc(id).get();
  return snap.exists ? (snap.data() as Lead) : null;
}

export async function saveLead(lead: Lead): Promise<void> {
  if (fromSeed()) return seedSaveLead(lead);
  await adminDb().collection(LEADS).doc(lead.id).set(clean(lead));
  leadsCache.prime(lead);
}

/** Batched bulk write for seeding (Firestore caps batches at 500). */
export async function saveLeadsBatch(leads: Lead[]): Promise<void> {
  const db = adminDb();
  const col = db.collection(LEADS);
  for (let i = 0; i < leads.length; i += 400) {
    const batch = db.batch();
    for (const lead of leads.slice(i, i + 400)) {
      batch.set(col.doc(lead.id), clean(lead));
    }
    await batch.commit();
  }
  leadsCache.invalidate(); // bulk write — let the next read refetch the whole book
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  if (fromSeed()) {
    const cur = seedLead(id);
    if (cur) seedSaveLead({ ...cur, ...patch, updatedAt: new Date().toISOString() });
    return;
  }
  const stamped = { ...patch, updatedAt: new Date().toISOString() };
  await adminDb().collection(LEADS).doc(id).set(clean(stamped), { merge: true });
  leadsCache.patch(id, stamped);
}

/**
 * Permanently remove a lead and everything hanging off it — its forms, timeline,
 * documents, outbound audit rows, and stored files. Irreversible (unlike the
 * archive path, which keeps the record). Firestore subcollections must be
 * deleted explicitly; deleting the parent doc alone would orphan them.
 */
export async function deleteLead(id: string): Promise<void> {
  if (fromSeed()) {
    seedDeleteLead(id);
  } else {
    const db = adminDb();
    const leadRef = db.collection(LEADS).doc(id);
    for (const sub of ["timeline", "documents"]) {
      const snap = await leadRef.collection(sub).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await leadRef.delete();
    for (const col of [FORMS, OUTBOUND]) {
      const snap = await db.collection(col).where("leadId", "==", id).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    leadsCache.remove(id);
  }
  await deleteLeadFiles(id);
}

/* ----------------------------- duplicate scan --------------------------- */

const gushHelkaTokens = (l: Pick<Lead, "gushHelka">) =>
  new Set(l.gushHelka.map((g) => g.replace(/\s+/g, "").replace(/["'׳״]/g, "")));

const normKey = (l: Pick<Lead, "city" | "projectName" | "address">) =>
  `${(l.city ?? "").trim()}|${(l.address ?? l.projectName).replace(/\s+/g, "")}`;

/** Archive-flywheel: find a prior lead for the same site. */
export async function findDuplicate(lead: Lead): Promise<DuplicateHit | null> {
  const all = await listLeads();
  const tokens = gushHelkaTokens(lead);
  const key = normKey(lead);
  for (const other of all) {
    if (other.id === lead.id) continue;
    const shareGush =
      tokens.size > 0 && [...gushHelkaTokens(other)].some((t) => tokens.has(t));
    const sameKey = key.length > 2 && normKey(other) === key;
    if (shareGush || sameKey) {
      return {
        id: other.id,
        projectName: other.projectName,
        rejectionReasonLabel: other.rejectionReason
          ? REJECTION_REASON_LABEL[other.rejectionReason]
          : null,
        receivedAt: other.leadReceivedAt ?? null,
      };
    }
  }
  return null;
}

/* ------------------------- timeline & documents ------------------------- */

export async function listTimeline(leadId: string): Promise<TimelineEvent[]> {
  if (fromSeed()) return seedTimeline(leadId);
  const snap = await adminDb().collection(LEADS).doc(leadId).collection("timeline").get();
  return snap.docs
    .map((d) => d.data() as TimelineEvent)
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

export async function addTimelineEvent(evt: TimelineEvent): Promise<void> {
  if (fromSeed()) return seedAddTimeline(evt);
  await adminDb()
    .collection(LEADS)
    .doc(evt.leadId)
    .collection("timeline")
    .doc(evt.id)
    .set(clean(evt));
}

export async function listDocuments(leadId: string): Promise<LeadDocument[]> {
  if (fromSeed()) return devStore.documentsFor(leadId);
  const snap = await adminDb().collection(LEADS).doc(leadId).collection("documents").get();
  return snap.docs.map((d) => d.data() as LeadDocument);
}

export async function addDocument(doc: LeadDocument): Promise<void> {
  if (fromSeed()) return devStore.addDocument(doc);
  await adminDb()
    .collection(LEADS)
    .doc(doc.leadId)
    .collection("documents")
    .doc(doc.id)
    .set(clean(doc));
}

/* --------------------------------- forms -------------------------------- */

export async function saveForm(form: LeadForm): Promise<void> {
  if (fromSeed()) return seedSaveForm(form);
  await adminDb().collection(FORMS).doc(form.id).set(clean(form));
}

export async function getFormByToken(
  token: string,
): Promise<{ form: LeadForm; lead: Lead } | null> {
  if (fromSeed()) return seedFormByToken(token);
  const snap = await adminDb().collection(FORMS).where("token", "==", token).limit(1).get();
  if (snap.empty) return null;
  const form = snap.docs[0].data() as LeadForm;
  const lead = await getLead(form.leadId);
  if (!lead) return null;
  return { form, lead };
}

export async function markFormOpened(token: string): Promise<void> {
  const found = await getFormByToken(token);
  if (!found || found.form.status !== "sent") return;
  const updated: LeadForm = {
    ...found.form,
    status: "opened",
    openedAt: new Date().toISOString(),
  };
  await saveForm(updated);
}

export async function getForm(leadId: string): Promise<LeadForm | null> {
  if (fromSeed()) return seedFormForLead(leadId);
  const snap = await adminDb()
    .collection(FORMS)
    .where("leadId", "==", leadId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as LeadForm);
}

/* ------------------------------- outbound ------------------------------- */

export async function logOutbound(email: OutboundEmail): Promise<void> {
  if (fromSeed()) return seedAddOutbound(email);
  await adminDb().collection(OUTBOUND).doc(email.id).set(clean(email));
}

export async function listOutbound(sinceIso?: string): Promise<OutboundEmail[]> {
  let out: OutboundEmail[];
  if (fromSeed()) {
    out = seedOutbound();
  } else {
    const snap = await adminDb().collection(OUTBOUND).get();
    out = snap.docs.map((d) => d.data() as OutboundEmail);
  }
  if (sinceIso) out = out.filter((e) => e.at >= sinceIso);
  return out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}

/* -------------------------- form submit → re-grade ---------------------- */

/**
 * Apply form answers onto the lead's facts and recompute the final grade.
 * Returns the updated lead. This is the "final grade" step of the pipeline.
 */
export async function applyFormSubmission(
  token: string,
  answers: LeadForm["answers"],
): Promise<Lead | null> {
  const found = await getFormByToken(token);
  if (!found) return null;
  const { form, lead } = found;

  const patch = mapAnswersToFacts(lead, form, answers);
  const config = await getConfig();
  const merged = { ...lead, ...patch } as Lead;
  const regraded = recomputeTriage(merged, config, existingExtraFlags(lead));

  await saveLead(regraded);
  await snapshotFormSubmitted(form, answers);
  await addTimelineEvent({
    id: crypto.randomUUID(),
    leadId: lead.id,
    at: new Date().toISOString(),
    kind: "form_submitted",
    title: "התקבל מענה לטופס השלמת הפרטים",
  });
  return regraded;
}

/** Keep AI/duplicate flags that the engine can't re-derive from facts alone. */
function existingExtraFlags(lead: Lead) {
  return lead.flags.filter((f) => f.id === "duplicate_lead");
}

function mapAnswersToFacts(
  lead: Lead,
  form: LeadForm,
  answers: LeadForm["answers"],
): Partial<Lead> {
  const patch: Partial<Lead> = {};
  const prov = { ...lead.provenance };
  for (const q of form.questions) {
    const a = answers[q.key];
    if (!a || a.value == null || a.value === "") continue;
    if (!q.fact) continue;
    switch (q.fact) {
      case "unitsExisting":
      case "unitsPlanned":
      case "developerUnits":
      case "lotAreaDunam":
      case "shops":
      case "signaturePct":
      case "publicHousingPct":
        (patch as Record<string, unknown>)[q.fact] = Number(a.value);
        break;
      case "registeredInMaagar":
        patch.registeredInMaagar = Boolean(a.value);
        break;
      case "sourceFee":
        patch.sourceFee = {
          amount: Number(a.value),
          currency: "ILS",
          structure: lead.sourceFee?.structure ?? "fixed",
          note: lead.sourceFee?.note ?? null,
        } as Lead["sourceFee"];
        break;
      default:
        break;
    }
    prov[q.fact] = { origin: "form", label: "טופס השלמת פרטים" };
  }
  patch.provenance = prov;
  return patch;
}

async function snapshotFormSubmitted(
  form: LeadForm,
  answers: LeadForm["answers"],
): Promise<void> {
  const updated: LeadForm = {
    ...form,
    answers,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };
  await saveForm(updated);
}
