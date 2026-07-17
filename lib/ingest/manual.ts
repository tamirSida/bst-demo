import "server-only";
import { isReadableDoc, type EmailAttachment, type ParsedEmail } from "../eml/parse";
import { ingestParsedEmail, type IngestOutcome } from "./run";

/** A file supplied to the manual-upload path (already read into a Buffer). */
export interface ManualFileInput {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface ManualInput {
  text?: string;
  files?: ManualFileInput[];
}

/** Nothing readable to ingest (no text, no readable doc) — the route maps this to a 400. */
export class ManualInputError extends Error {}

const isPlainText = (f: ManualFileInput) =>
  /text\/plain/i.test(f.contentType) || /\.(txt|md)$/i.test(f.filename);

/**
 * Build a synthetic ParsedEmail from pasted text and/or uploaded files, so a
 * manual lead flows through the SAME extraction/grading pipeline as an email —
 * no pipeline duplication. Plain-text files are folded into the body (the model
 * reads it); PDFs/DOCX become documents; images/other become metadata-only.
 */
export function buildManualEmail(input: ManualInput): ParsedEmail {
  const files = input.files ?? [];
  const textParts: string[] = [];
  if (input.text?.trim()) textParts.push(input.text.trim());

  const documents: EmailAttachment[] = [];
  const otherAttachments: ParsedEmail["otherAttachments"] = [];

  for (const f of files) {
    if (isPlainText(f)) {
      const decoded = f.content.toString("utf8").trim();
      if (decoded) textParts.push(decoded);
      continue;
    }
    if (isReadableDoc(f.filename, f.contentType)) {
      documents.push({
        filename: f.filename,
        contentType: f.contentType,
        content: f.content,
        sizeBytes: f.content.length,
      });
    } else {
      otherAttachments.push({
        filename: f.filename,
        contentType: f.contentType,
        sizeBytes: f.content.length,
      });
    }
  }

  const text = textParts.join("\n\n");
  if (!text && documents.length === 0) {
    throw new ManualInputError("יש להזין טקסט או לצרף קובץ קריא (PDF/טקסט).");
  }

  // Subject is only a projectName fallback (the model usually extracts a real
  // one). Use the first line only if it reads like a title, else a document name
  // or a generic label — never a long run-on slice.
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean);
  const title = firstLine && firstLine.length <= 80 ? firstLine : null;
  const subject = title || documents[0]?.filename || "ליד ידני";

  return {
    messageId: null,
    inReplyTo: null,
    references: [],
    fromName: null,
    fromEmail: null,
    to: [],
    subject,
    date: null,
    text,
    documents,
    otherAttachments,
  };
}

/** Ingest a manual lead (no email envelope). Skips thread-matching by design. */
export async function ingestManual(input: ManualInput): Promise<IngestOutcome> {
  const email = buildManualEmail(input);
  return ingestParsedEmail(email, undefined, { skipThreadMatch: true, origin: "manual" });
}
