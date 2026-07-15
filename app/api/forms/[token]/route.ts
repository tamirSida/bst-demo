import { NextResponse } from "next/server";
import type { LeadForm } from "@/lib/domain/types";
import { applyFormSubmission, markFormOpened } from "@/lib/firebase/repo";

export const runtime = "nodejs";

/** Public: mark a form opened (no auth — the token is the gate). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  await markFormOpened(token);
  return NextResponse.json({ ok: true });
}

/** Public: submit the completed form → re-grade the lead. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = (await request.json()) as { answers: LeadForm["answers"] };
  const lead = await applyFormSubmission(token, body.answers ?? {});
  if (!lead) return NextResponse.json({ error: "טופס לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true, leadId: lead.id });
}
