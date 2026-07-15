import { NextResponse } from "next/server";
import { ingestRawEmail } from "@/lib/ingest/run";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Demo entry point: upload an .eml file and run it through the pipeline. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "לא צורף קובץ .eml" }, { status: 400 });
    }
    const raw = Buffer.from(await file.arrayBuffer());
    const { leadId } = await ingestRawEmail(raw);
    return NextResponse.json({ leadId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
