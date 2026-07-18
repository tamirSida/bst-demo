import { NextResponse } from "next/server";
import { classifyDoc } from "@/lib/eml/classify";
import type { LeadForm } from "@/lib/domain/types";
import {
  addDocument,
  applyFormSubmission,
  getFormByToken,
  markFormOpened,
} from "@/lib/firebase/repo";
import { saveLeadFile } from "@/lib/storage/files";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Public: mark a form opened (no auth — the token is the gate). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  await markFormOpened(token);
  return NextResponse.json({ ok: true });
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Public: submit the completed form → store uploaded files as real lead
 * documents → apply answers → re-grade the lead. Accepts either multipart
 * form-data ("answers" JSON + `file:<questionKey>` parts) or plain JSON.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const found = await getFormByToken(token);
  if (!found) return NextResponse.json({ error: "טופס לא נמצא" }, { status: 404 });
  const leadId = found.lead.id;

  let answers: LeadForm["answers"] = {};
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const fd = await request.formData();
    try {
      answers = JSON.parse(String(fd.get("answers") ?? "{}")) as LeadForm["answers"];
    } catch {
      return NextResponse.json({ error: "פורמט תשובות שגוי" }, { status: 400 });
    }

    for (const [field, value] of fd.entries()) {
      if (!field.startsWith("file:") || !(value instanceof Blob)) continue;
      const key = field.slice("file:".length);
      const fileName = (value as File).name || `${key}.pdf`;
      if (value.size === 0 || value.size > MAX_UPLOAD_BYTES) continue;

      const buf = Buffer.from(await value.arrayBuffer());
      const url = await saveLeadFile(leadId, fileName, buf);
      await addDocument({
        id: crypto.randomUUID(),
        leadId,
        type: classifyDoc(fileName),
        fileName,
        storagePath: url,
        mime: value.type || "application/octet-stream",
        sizeBytes: value.size,
        receivedAt: new Date().toISOString(),
      });
      answers[key] = {
        value: fileName,
        files: [{ fileName, storagePath: url, mime: value.type, sizeBytes: value.size }],
      };
    }
  } else {
    const body = (await request.json()) as { answers?: LeadForm["answers"] };
    answers = body.answers ?? {};
  }

  const lead = await applyFormSubmission(token, answers);
  if (!lead) return NextResponse.json({ error: "טופס לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true, leadId: lead.id });
}
