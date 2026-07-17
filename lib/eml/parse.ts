/**
 * .eml parsing via mailparser. Normalises a raw RFC-822 message into the fields
 * the pipeline needs: headers (for thread matching), body text, and attachments
 * split into "documents" (PDF/DOCX we feed to Claude) vs "images" (skipped —
 * signatures, logos, tracking pixels that bloat the real BST threads).
 */

import { simpleParser, type AddressObject } from "mailparser";

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
  sizeBytes: number;
}

export interface ParsedEmail {
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromName: string | null;
  fromEmail: string | null;
  to: string[];
  subject: string;
  date: string | null; // ISO
  text: string;
  /** PDF / DOCX attachments worth reading. */
  documents: EmailAttachment[];
  /** Images and other noise, kept only as metadata. */
  otherAttachments: { filename: string; contentType: string; sizeBytes: number }[];
}

const DOC_MIME = /pdf|word|officedocument|msword|rtf|plain/i;
const DOC_EXT = /\.(pdf|docx?|rtf|txt)$/i;

/** A file worth reading as a document (PDF/DOCX/RTF/TXT), vs. image/other noise. */
export function isReadableDoc(filename: string, contentType: string): boolean {
  return DOC_MIME.test(contentType) || DOC_EXT.test(filename);
}

function firstAddress(a: AddressObject | AddressObject[] | undefined): {
  name: string | null;
  email: string | null;
} {
  const obj = Array.isArray(a) ? a[0] : a;
  const v = obj?.value?.[0];
  return { name: v?.name || null, email: v?.address || null };
}

function allAddresses(a: AddressObject | AddressObject[] | undefined): string[] {
  const objs = Array.isArray(a) ? a : a ? [a] : [];
  return objs.flatMap((o) => o.value.map((v) => v.address).filter((x): x is string => !!x));
}

export async function parseEml(raw: Buffer | string): Promise<ParsedEmail> {
  const mail = await simpleParser(raw);
  const from = firstAddress(mail.from);

  const documents: EmailAttachment[] = [];
  const otherAttachments: ParsedEmail["otherAttachments"] = [];
  for (const att of mail.attachments ?? []) {
    const filename = att.filename ?? "attachment";
    const contentType = att.contentType ?? "application/octet-stream";
    const isDoc = isReadableDoc(filename, contentType);
    if (isDoc && att.content) {
      documents.push({
        filename,
        contentType,
        content: att.content as Buffer,
        sizeBytes: att.size ?? (att.content as Buffer).length,
      });
    } else {
      otherAttachments.push({ filename, contentType, sizeBytes: att.size ?? 0 });
    }
  }

  return {
    messageId: mail.messageId ?? null,
    inReplyTo: mail.inReplyTo ?? null,
    references: normalizeRefs(mail.references),
    fromName: from.name,
    fromEmail: from.email,
    to: allAddresses(mail.to),
    subject: (mail.subject ?? "").trim(),
    date: mail.date ? mail.date.toISOString() : null,
    text: (mail.text ?? "").trim(),
    documents,
    otherAttachments,
  };
}

function normalizeRefs(refs: string | string[] | undefined): string[] {
  if (!refs) return [];
  return Array.isArray(refs) ? refs : [refs];
}
