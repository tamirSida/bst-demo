/**
 * Ingest job shapes + the shared runner.
 *
 * This module is imported from BOTH the Next.js app (dev inline path) and the
 * standalone Netlify background function, so it must stay free of Next-only
 * concerns. It pulls in the heavy pipeline lazily so importing the type surface
 * is cheap.
 *
 * All ingest logs originate here (prefix `[ingest]`) so both paths emit the same
 * start / done / FAILED lines with timing — greppable in the Netlify function
 * log and the dev server output. We log identifiers and counts, never lead
 * content or email bodies.
 */

import type { IngestOutcome } from "./run";

export type IngestJob =
  | { kind: "email-id"; emailId: string }
  | { kind: "email-raw"; raw: string } // base64-encoded MIME
  | {
      kind: "manual";
      text: string;
      files: { filename: string; contentType: string; content: string }[]; // content = base64
    };

/** Short, PII-free description of a job for logs. */
function describe(job: IngestJob): string {
  switch (job.kind) {
    case "email-id":
      return `kind=email-id emailId=${job.emailId}`;
    case "email-raw":
      return `kind=email-raw bytes=${Math.round((job.raw.length * 3) / 4)}`;
    case "manual":
      return `kind=manual textChars=${job.text.length} files=${job.files.length}`;
  }
}

/** Run one ingest job to completion (the ~30s AI pipeline). Logs start/done/failed. */
export async function runIngestJob(job: IngestJob): Promise<IngestOutcome | null> {
  const label = describe(job);
  const started = Date.now();
  console.log(`[ingest] start ${label}`);
  try {
    const outcome = await dispatch(job);
    const ms = Date.now() - started;
    console.log(
      `[ingest] done ${label} lead=${outcome?.leadId ?? "?"} action=${outcome?.action ?? "?"} ms=${ms}`,
    );
    return outcome;
  } catch (err) {
    const ms = Date.now() - started;
    console.error(`[ingest] FAILED ${label} ms=${ms} error=${(err as Error).message}`);
    console.error(err); // full stack for debugging
    throw err;
  }
}

async function dispatch(job: IngestJob): Promise<IngestOutcome> {
  if (job.kind === "email-raw") {
    const { ingestRawEmail } = await import("./run");
    return ingestRawEmail(Buffer.from(job.raw, "base64"));
  }
  if (job.kind === "email-id") {
    const { ingestParsedEmail } = await import("./run");
    const { fetchReceivedEmail } = await import("../email/resendInbound");
    const email = await fetchReceivedEmail(job.emailId);
    return ingestParsedEmail(email);
  }
  // manual
  const { ingestManual } = await import("./manual");
  return ingestManual({
    text: job.text,
    files: job.files.map((f) => ({
      filename: f.filename,
      contentType: f.contentType,
      content: Buffer.from(f.content, "base64"),
    })),
  });
}
