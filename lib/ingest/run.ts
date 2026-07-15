import "server-only";
import { parseEml, type ParsedEmail } from "../eml/parse";
import { runIngestPipeline } from "../ai/pipeline";
import { DocType } from "../domain/enums";
import type { LeadDocument, TimelineEvent } from "../domain/types";
import {
  addDocument,
  addTimelineEvent,
  getConfig,
  findDuplicate,
  listLeads,
} from "../firebase/repo";
import { saveLeadFile } from "../storage/files";
import { persistIngestResult } from "./persist";

export interface IngestOutcome {
  leadId: string;
  /** "created" = new lead; "attached" = reply matched an existing lead. */
  action: "created" | "attached";
}

/** Demo/webhook path: raw .eml → parsed → ingest. */
export async function ingestRawEmail(raw: Buffer): Promise<IngestOutcome> {
  const email = await parseEml(raw);
  return ingestParsedEmail(email, raw);
}

/**
 * Shared inbound path (raw .eml upload, Resend webhook, dev poller).
 * Thread matching first: a reply carrying one of our lead markers (or replying
 * to our message) attaches to the existing lead's timeline instead of becoming
 * a duplicate. Everything else runs the full AI pipeline as a new lead.
 */
export async function ingestParsedEmail(
  email: ParsedEmail,
  raw?: Buffer,
): Promise<IngestOutcome> {
  const existing = await matchThread(email);
  if (existing) {
    await addTimelineEvent(timelineEvent(existing, `התקבל מייל תשובה: ${email.subject || "(ללא נושא)"}`));
    await storeAttachments(existing, raw ?? null, email, []);
    return { leadId: existing, action: "attached" };
  }

  const config = await getConfig();
  const formBaseUrl = `${process.env.APP_URL ?? ""}/f/`;
  const result = await runIngestPipeline(email, { config, findDuplicate, formBaseUrl });
  await persistIngestResult(result);
  await storeAttachments(result.lead.id, raw ?? null, email, result.documents);
  return { leadId: result.lead.id, action: "created" };
}

/** Find an existing lead this email belongs to (marker in subject/body). */
async function matchThread(email: ParsedEmail): Promise<string | null> {
  const haystack = `${email.subject}\n${email.text.slice(0, 2000)}`;
  const marker = haystack.match(/BST-L-\d{4}/)?.[0];
  if (!marker) return null;
  const leads = await listLeads();
  return leads.find((l) => l.threadKey === marker)?.id ?? null;
}

function timelineEvent(leadId: string, title: string): TimelineEvent {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `evt_${Date.now()}`,
    leadId,
    at: new Date().toISOString(),
    kind: "email_in",
    title,
  };
}

/** Save the raw email + each document attachment and register them as docs. */
async function storeAttachments(
  leadId: string,
  raw: Buffer | null,
  email: ParsedEmail,
  classified: { fileName: string; type: string }[],
): Promise<void> {
  const now = new Date().toISOString();

  if (raw) {
    const emlUrl = saveLeadFile(leadId, "המייל-המקורי.eml", raw);
    await addDocument(
      doc(leadId, "המייל המקורי (.eml)", DocType.Other, emlUrl, "message/rfc822", raw.length, now),
    );
  }

  for (const att of email.documents) {
    const type = (classified.find((c) => c.fileName === att.filename)?.type ??
      DocType.Other) as DocType;
    const url = saveLeadFile(leadId, att.filename, att.content);
    await addDocument(doc(leadId, att.filename, type, url, att.contentType, att.sizeBytes, now));
  }
}

function doc(
  leadId: string,
  fileName: string,
  type: DocType,
  url: string,
  mime: string,
  size: number,
  at: string,
): LeadDocument {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `doc_${Date.now()}`,
    leadId,
    type,
    fileName,
    storagePath: url,
    mime,
    sizeBytes: size,
    receivedAt: at,
  };
}
