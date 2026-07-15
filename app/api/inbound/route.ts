import { NextResponse } from "next/server";
import { ingestRawEmail } from "@/lib/ingest/run";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Live inbound email webhook (production). Provider-agnostic: accepts a raw MIME
 * message either as the request body (Content-Type: message/rfc822) or as a
 * base64 `raw` field in a JSON payload. Provider-specific signature verification
 * and full-message fetch (Resend `email.received` / Mailgun store) are wired at
 * DNS-setup time; the ingestion path below is shared with the demo route.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let raw: Buffer;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { raw?: string };
      if (!body.raw) {
        return NextResponse.json({ error: "missing raw email" }, { status: 400 });
      }
      raw = Buffer.from(body.raw, "base64");
    } else {
      raw = Buffer.from(await request.arrayBuffer());
    }

    const { leadId } = await ingestRawEmail(raw);
    return NextResponse.json({ ok: true, leadId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
