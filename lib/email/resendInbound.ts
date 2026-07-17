/**
 * Resend inbound support. Two transports feed the same ingestion:
 *  - Production: the email.received webhook (svix-signed) → fetch by id.
 *  - Dev: a poller that lists GET /emails/receiving and ingests new ids
 *    (no public URL needed for local end-to-end).
 * Both map Resend's received-email JSON into the pipeline's ParsedEmail shape.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailAttachment, ParsedEmail } from "../eml/parse";

const API = "https://api.resend.com";

function key(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY missing");
  return k;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${key()}` },
  });
  if (!res.ok) throw new Error(`Resend ${path} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/* ---------------------------- received emails ---------------------------- */

interface ReceivedListItem {
  id: string;
  [k: string]: unknown;
}

export async function listReceivedIds(): Promise<string[]> {
  const out = await api<{ data?: ReceivedListItem[] }>("/emails/receiving");
  return (out.data ?? []).map((e) => e.id).filter(Boolean);
}

/** Received emails with the light metadata the list already carries (no fetch). */
export interface ReceivedSummary {
  id: string;
  subject: string;
  from: string | null;
  at: string | null;
}

export async function listReceived(): Promise<ReceivedSummary[]> {
  const out = await api<{ data?: Rec[] }>("/emails/receiving");
  return (out.data ?? [])
    .map((e) => ({
      id: str(e, "id") ?? "",
      subject: str(e, "subject") ?? "",
      from: parseFrom(e.from).email,
      at: str(e, "created_at", "date"),
    }))
    .filter((e) => e.id);
}

/** Tolerant field access — Resend's shapes vary slightly across API versions. */
type Rec = Record<string, unknown>;
const str = (o: Rec, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
};

function parseFrom(v: unknown): { name: string | null; email: string | null } {
  if (typeof v === "string") {
    const m = v.match(/^(.*?)\s*<([^>]+)>$/);
    return m ? { name: m[1].trim() || null, email: m[2] } : { name: null, email: v };
  }
  if (v && typeof v === "object") {
    const o = v as Rec;
    return { name: str(o, "name"), email: str(o, "email", "address") };
  }
  return { name: null, email: null };
}

function toList(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.map((x) => parseFrom(x).email).filter((x): x is string => !!x);
  return [];
}

/** Fetch a received email + its attachments and map to ParsedEmail. */
export async function fetchReceivedEmail(id: string): Promise<ParsedEmail> {
  const raw = await api<Rec>(`/emails/receiving/${id}`);

  const attachmentsMeta = (raw.attachments as Rec[] | undefined) ?? [];
  const documents: EmailAttachment[] = [];
  const otherAttachments: ParsedEmail["otherAttachments"] = [];

  for (const meta of attachmentsMeta) {
    const filename = str(meta, "filename", "name") ?? "attachment";
    const contentType = str(meta, "content_type", "contentType", "type") ?? "application/octet-stream";
    const attId = str(meta, "id");
    const isDoc = /pdf|word|officedocument|msword|rtf/i.test(contentType) || /\.(pdf|docx?|rtf)$/i.test(filename);
    if (!isDoc) {
      otherAttachments.push({ filename, contentType, sizeBytes: Number(meta.size ?? 0) });
      continue;
    }
    const content = await downloadAttachment(id, attId, meta);
    if (content) {
      documents.push({ filename, contentType, content, sizeBytes: content.length });
    } else {
      otherAttachments.push({ filename, contentType, sizeBytes: Number(meta.size ?? 0) });
    }
  }

  const from = parseFrom(raw.from);
  return {
    messageId: str(raw, "message_id", "messageId"),
    inReplyTo: str(raw, "in_reply_to", "inReplyTo"),
    references: [],
    fromName: from.name,
    fromEmail: from.email,
    to: toList(raw.to),
    subject: str(raw, "subject") ?? "",
    date: str(raw, "created_at", "date"),
    text: str(raw, "text") ?? stripHtml(str(raw, "html")) ?? "",
    documents,
    otherAttachments,
  };
}

/** Decode base64 (tolerating a `data:...;base64,` prefix); null if empty. */
function fromBase64(s: string): Buffer | null {
  const cleaned = s.replace(/^data:[^;,]*;base64,/i, "").trim();
  const buf = Buffer.from(cleaned, "base64");
  return buf.length > 0 ? buf : null;
}

/**
 * Resolve an attachment to its raw bytes. Resend inbound returns attachment
 * metadata only — the real content is up to two hops away:
 *   metadata → GET /attachments/{id} (JSON) → signed `download_url` → bytes.
 * We also accept an inline base64 field or a direct URL, since Resend's shapes
 * vary across API versions. A JSON response is followed (via `content`/`data`,
 * or a nested `download_url`/`url`); a binary response IS the file.
 *
 * The earlier version stopped at the first hop and returned the JSON metadata
 * bytes as the "PDF", which Claude rejected as an invalid document.
 */
async function downloadAttachment(
  emailId: string,
  attId: string | null,
  meta: Rec,
): Promise<Buffer | null> {
  const inline = str(meta, "content", "data");
  if (inline) {
    const buf = fromBase64(inline);
    if (buf) return buf;
  }

  let target =
    str(meta, "download_url", "url") ??
    (attId ? `${API}/emails/receiving/${emailId}/attachments/${attId}` : null);

  for (let hop = 0; target && hop < 3; hop++) {
    let res: Response;
    try {
      res = await fetch(target, {
        headers: target.startsWith(API) ? { Authorization: `Bearer ${key()}` } : undefined,
      });
    } catch {
      return null;
    }
    if (!res.ok) return null;

    const isJson = (res.headers.get("content-type") ?? "").includes("json");
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isJson) return buf; // a binary body is the file itself

    let next: string | null;
    try {
      const j = JSON.parse(buf.toString("utf8")) as Rec;
      const b64 = str(j, "content", "data");
      if (b64) {
        const decoded = fromBase64(b64);
        if (decoded) return decoded;
      }
      next = str(j, "download_url", "url");
    } catch {
      return null;
    }
    if (!next || next === target) return null;
    target = next;
  }
  return null;
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/* ----------------------------- webhook verify ---------------------------- */

/**
 * Verify a Resend (svix) webhook signature. Secret comes from
 * RESEND_WEBHOOK_SECRET ("whsec_..."). Returns true when valid, or when no
 * secret is configured (verification then intentionally off, e.g. local dev).
 */
export function verifyResendWebhook(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // svix-signature: "v1,<sig> v1,<sig2> ..."
  return headers.signature.split(" ").some((part) => {
    const sig = part.split(",")[1] ?? "";
    try {
      const a = Buffer.from(sig, "base64");
      const b = Buffer.from(expected, "base64");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}
