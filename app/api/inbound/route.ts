import { NextResponse } from "next/server";
import { enqueueIngest } from "@/lib/ingest/enqueue";
import { verifyResendWebhook } from "@/lib/email/resendInbound";
import { endProcessing, startProcessing } from "@/lib/ingest/processingStore";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Live inbound email entry point. The heavy AI ingest is handed to a background
 * function (see `enqueueIngest`), so this handler stays fast and never risks the
 * synchronous-function timeout. Accepts, in order of detection:
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
        data?: {
          email_id?: string;
          id?: string;
          subject?: string;
          from?: string | { address?: string };
        };
        raw?: string;
      };

      // Resend webhook envelope
      if (body.type) {
        const ok = verifyResendWebhook(payload, {
          id: request.headers.get("svix-id"),
          timestamp: request.headers.get("svix-timestamp"),
          signature: request.headers.get("svix-signature"),
        });
        if (!ok) {
          console.error("[inbound] 401 webhook signature verification failed");
          return NextResponse.json({ error: "bad signature" }, { status: 401 });
        }
        if (body.type !== "email.received") {
          console.log(`[inbound] ignored webhook type=${body.type}`);
          return NextResponse.json({ ignored: body.type });
        }

        const emailId = body.data?.email_id ?? body.data?.id;
        if (!emailId) return NextResponse.json({ error: "missing email id" }, { status: 400 });

        console.log(`[inbound] webhook email.received emailId=${emailId}`);
        // Mark in-flight BEFORE dispatching, so the dashboard banner appears at
        // once instead of after the ~30s pipeline. The webhook payload usually
        // carries subject/from; when it doesn't, the banner falls back to a
        // generic line. Never let a marker failure block the actual ingest.
        const from = body.data?.from;
        await startProcessing({
          id: emailId,
          subject: body.data?.subject ?? "",
          from: (typeof from === "string" ? from : from?.address) ?? null,
          at: new Date().toISOString(),
        }).catch((err) =>
          console.error(`[inbound] marker write failed emailId=${emailId}: ${(err as Error).message}`),
        );

        let background: boolean;
        try {
          ({ background } = await enqueueIngest({ kind: "email-id", emailId }));
        } catch (err) {
          // Dispatch failed — drop the marker now rather than leaving the banner
          // spinning until the staleness cutoff.
          await endProcessing(emailId).catch(() => {});
          throw err;
        }
        return NextResponse.json({ ok: true, queued: background }, { status: background ? 202 : 200 });
      }

      // JSON { raw } fallback
      if (body.raw) {
        const { background } = await enqueueIngest({ kind: "email-raw", raw: body.raw });
        return NextResponse.json({ ok: true, queued: background }, { status: background ? 202 : 200 });
      }
      return NextResponse.json({ error: "unrecognized payload" }, { status: 400 });
    }

    // Raw MIME body
    const raw = Buffer.from(await request.arrayBuffer());
    if (!raw.length) return NextResponse.json({ error: "empty body" }, { status: 400 });
    const { background } = await enqueueIngest({ kind: "email-raw", raw: raw.toString("base64") });
    return NextResponse.json({ ok: true, queued: background }, { status: background ? 202 : 200 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
