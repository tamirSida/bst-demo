import { NextResponse } from "next/server";
import { fetchReceivedEmail, listReceived } from "@/lib/email/resendInbound";
import { ingestParsedEmail } from "@/lib/ingest/run";
import {
  endProcessing,
  markInboundSeen,
  processingIds,
  recordInboundFailure,
  seenInboundIds,
  startProcessing,
} from "@/lib/ingest/pollState";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Give a failing email a few retries (transient errors, deploys) before dropping it. */
const MAX_ATTEMPTS = 3;

/**
 * Dev-mode inbound transport: one poll cycle against Resend's received-emails
 * API. Lets the full inbound flow run locally with no public webhook URL.
 * Loop it with `npm run poll` (or any curl loop).
 *
 * The moment a new email is detected we record a lightweight "processing" marker
 * (from the list metadata, before any AI) so the dashboard can show it instantly.
 * That marker also acts as an in-flight lock, so a fast poll interval can't
 * double-process an email that's still being ingested.
 */
export async function POST() {
  try {
    const received = await listReceived();
    const seen = seenInboundIds();
    const inFlight = processingIds();
    const fresh = received.filter((e) => !seen.has(e.id) && !inFlight.has(e.id));

    const results: {
      id: string;
      leadId?: string;
      action?: string;
      error?: string;
      attempt?: number;
      gaveUp?: boolean;
    }[] = [];
    for (const item of fresh) {
      startProcessing({
        id: item.id,
        subject: item.subject,
        from: item.from,
        at: new Date().toISOString(),
      });
      try {
        const email = await fetchReceivedEmail(item.id);
        const outcome = await ingestParsedEmail(email);
        results.push({ id: item.id, ...outcome });
        markInboundSeen([item.id]);
      } catch (err) {
        // Don't drop on the first failure — retry up to MAX_ATTEMPTS, then give
        // up so a genuinely poison message can't wedge the loop.
        const attempt = recordInboundFailure(item.id);
        const gaveUp = attempt >= MAX_ATTEMPTS;
        if (gaveUp) markInboundSeen([item.id]);
        results.push({ id: item.id, error: (err as Error).message, attempt, gaveUp });
      } finally {
        endProcessing(item.id);
      }
    }

    return NextResponse.json({ checked: received.length, ingested: results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
