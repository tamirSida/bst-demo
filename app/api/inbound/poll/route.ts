import { NextResponse } from "next/server";
import { fetchReceivedEmail, listReceivedIds } from "@/lib/email/resendInbound";
import { ingestParsedEmail } from "@/lib/ingest/run";
import { markInboundSeen, seenInboundIds } from "@/lib/ingest/pollState";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Dev-mode inbound transport: one poll cycle against Resend's received-emails
 * API. Lets the full inbound flow run locally with no public webhook URL.
 * Loop it with `npm run poll` (or any curl loop).
 */
export async function POST() {
  try {
    const ids = await listReceivedIds();
    const seen = seenInboundIds();
    const fresh = ids.filter((id) => !seen.has(id));

    const results: { id: string; leadId?: string; action?: string; error?: string }[] = [];
    for (const id of fresh) {
      try {
        const email = await fetchReceivedEmail(id);
        const outcome = await ingestParsedEmail(email);
        results.push({ id, ...outcome });
      } catch (err) {
        results.push({ id, error: (err as Error).message });
      }
      // Mark seen either way so a poison message can't wedge the loop.
      markInboundSeen([id]);
    }

    return NextResponse.json({ checked: ids.length, ingested: results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
