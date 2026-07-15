import { NextResponse } from "next/server";
import { ingestRawEmail, ingestParsedEmail } from "@/lib/ingest/run";
import { fetchReceivedEmail, verifyResendWebhook } from "@/lib/email/resendInbound";
import { markInboundSeen } from "@/lib/ingest/pollState";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Live inbound email entry point. Accepts, in order of detection:
 *  1. Resend `email.received` webhook (JSON with type + data.email_id/id) —
 *     svix signature verified when RESEND_WEBHOOK_SECRET is set.
 *  2. A raw MIME message (Content-Type: message/rfc822 or multipart upload).
 *  3. JSON { raw: base64-MIME } — provider-agnostic fallback.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await request.text();
      const body = JSON.parse(payload) as {
        type?: string;
        data?: { email_id?: string; id?: string };
        raw?: string;
      };

      // Resend webhook envelope
      if (body.type) {
        const ok = verifyResendWebhook(payload, {
          id: request.headers.get("svix-id"),
          timestamp: request.headers.get("svix-timestamp"),
          signature: request.headers.get("svix-signature"),
        });
        if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });
        if (body.type !== "email.received") return NextResponse.json({ ignored: body.type });

        const emailId = body.data?.email_id ?? body.data?.id;
        if (!emailId) return NextResponse.json({ error: "missing email id" }, { status: 400 });

        const email = await fetchReceivedEmail(emailId);
        const outcome = await ingestParsedEmail(email);
        markInboundSeen([emailId]);
        return NextResponse.json({ ok: true, ...outcome });
      }

      // JSON { raw } fallback
      if (body.raw) {
        const outcome = await ingestRawEmail(Buffer.from(body.raw, "base64"));
        return NextResponse.json({ ok: true, ...outcome });
      }
      return NextResponse.json({ error: "unrecognized payload" }, { status: 400 });
    }

    // Raw MIME body
    const raw = Buffer.from(await request.arrayBuffer());
    if (!raw.length) return NextResponse.json({ error: "empty body" }, { status: 400 });
    const outcome = await ingestRawEmail(raw);
    return NextResponse.json({ ok: true, ...outcome });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
