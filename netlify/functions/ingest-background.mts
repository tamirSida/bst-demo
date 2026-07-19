// Netlify Background Function (the "-background" suffix gives it the 15-minute
// budget). Runs the ~30s AI ingest pipeline off the synchronous request path.
//
// The endpoint is public, so every request must carry the shared secret in
// `x-ingest-token` (set by lib/ingest/enqueue.ts). Fail closed: if the secret
// isn't configured, or doesn't match, the request is rejected.
//
// A background function can't answer the original caller, so its logs (prefix
// `[ingest-bg]`, plus the `[ingest]` lines from the runner) are the only way to
// observe what happened.
import { timingSafeEqual } from "node:crypto";
import { runIngestJob, type IngestJob } from "../../lib/ingest/jobs";

function authorized(provided: string | null): boolean {
  const expected = process.env.INGEST_FUNCTION_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const handler = async (req: Request): Promise<Response> => {
  if (!authorized(req.headers.get("x-ingest-token"))) {
    console.error("[ingest-bg] 401 rejected — missing or invalid x-ingest-token");
    return new Response("unauthorized", { status: 401 });
  }

  let job: IngestJob;
  try {
    job = (await req.json()) as IngestJob;
  } catch {
    console.error("[ingest-bg] 400 bad payload — body was not valid JSON");
    return new Response("bad payload", { status: 400 });
  }

  console.log(`[ingest-bg] accepted job kind=${job.kind}`);
  try {
    await runIngestJob(job); // emits [ingest] start/done/FAILED with timing
  } catch {
    // Already logged in detail by runIngestJob; swallow so the function exits
    // cleanly (a thrown background function is just noise — the lead is lost
    // either way and the [ingest] FAILED line is the actionable record).
    console.error(`[ingest-bg] job kind=${job.kind} did not complete — see [ingest] FAILED above`);
  }
  return new Response(null, { status: 202 });
};

export default handler;
