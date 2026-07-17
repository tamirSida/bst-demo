import { NextResponse } from "next/server";
import { getProcessing } from "@/lib/ingest/pollState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cheap status endpoint the dashboard polls a few times a second to show a live
 * "processing" banner while an inbound email is being ingested. Reads only the
 * poller's in-flight markers — no AI, no Resend call.
 */
export async function GET() {
  return NextResponse.json({ processing: getProcessing() });
}
