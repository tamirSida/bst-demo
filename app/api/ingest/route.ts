import { NextResponse } from "next/server";
import { enqueueIngest } from "@/lib/ingest/enqueue";
import { ManualInputError } from "@/lib/ingest/manual";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_BYTES = 15 * 1024 * 1024;

/**
 * Create a lead. Two input points share this route and the same pipeline:
 *  - email: a single `.eml` file (field `file`) — parsed as RFC-822.
 *  - manual: pasted text (field `text`) and/or uploaded files (field `files`).
 *
 * The AI ingest runs in a background function on Netlify, so this returns as
 * soon as the job is accepted — the new lead appears in the list shortly after.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // Email path — an uploaded .eml.
    const eml = form.get("file");
    if (eml instanceof Blob) {
      const raw = Buffer.from(await eml.arrayBuffer());
      console.log(`[ingest-route] .eml upload bytes=${raw.length}`);
      const { background } = await enqueueIngest({ kind: "email-raw", raw: raw.toString("base64") });
      return NextResponse.json({ queued: background }, { status: background ? 202 : 200 });
    }

    // Manual path — pasted text and/or files.
    const text = (form.get("text") as string | null)?.trim() ?? "";
    const uploads = form.getAll("files").filter((f): f is File => f instanceof Blob);

    const oversize = uploads.find((f) => f.size > MAX_FILE_BYTES);
    if (oversize) {
      return NextResponse.json(
        { error: `${oversize.name || "הקובץ"} גדול מדי (מעל 15MB).` },
        { status: 400 },
      );
    }

    if (!text && uploads.length === 0) {
      return NextResponse.json({ error: "לא צורף מידע. הזינו טקסט או צרפו קובץ." }, { status: 400 });
    }

    const files = await Promise.all(
      uploads.map(async (f) => ({
        filename: f.name || "file",
        contentType: f.type || "application/octet-stream",
        content: Buffer.from(await f.arrayBuffer()).toString("base64"),
      })),
    );

    console.log(`[ingest-route] manual upload textChars=${text.length} files=${files.length}`);
    const { background } = await enqueueIngest({ kind: "manual", text, files });
    return NextResponse.json({ queued: background }, { status: background ? 202 : 200 });
  } catch (err) {
    const status = err instanceof ManualInputError ? 400 : 500;
    console.error(`[ingest-route] error status=${status}: ${(err as Error).message}`);
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
