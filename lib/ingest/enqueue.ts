import "server-only";
import { runIngestJob, type IngestJob } from "./jobs";

export type { IngestJob };

const BG_FUNCTION = "/.netlify/functions/ingest-background";

/**
 * Dispatch an ingest job (the ~30s AI pipeline).
 *
 * On Netlify it's handed to a background function (15-min budget) so the HTTP
 * request returns immediately — the synchronous function limit (~26s on Pro)
 * would otherwise time the pipeline out. In local dev (no Netlify runtime) there
 * is no such limit, so we just run it inline and await it.
 *
 * Returns `background: true` when the work was handed off (lead appears later),
 * `false` when it ran inline to completion.
 */
export async function enqueueIngest(job: IngestJob): Promise<{ background: boolean }> {
  const base = process.env.NETLIFY
    ? process.env.URL ?? process.env.DEPLOY_URL ?? null
    : null;

  if (base) {
    const secret = process.env.INGEST_FUNCTION_SECRET;
    if (!secret) {
      // Fail closed: without a shared secret the endpoint would be unauthenticated.
      console.error("[ingest] dispatch REFUSED kind=" + job.kind + " — INGEST_FUNCTION_SECRET not set");
      throw new Error("INGEST_FUNCTION_SECRET is not set — refusing to dispatch ingest");
    }
    // Netlify answers a "-background" function with 202 and keeps running it.
    console.log(`[ingest] dispatch kind=${job.kind} -> background function`);
    const res = await fetch(`${base}${BG_FUNCTION}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-token": secret },
      body: JSON.stringify(job),
    });
    if (!res.ok && res.status !== 202) {
      console.error(`[ingest] dispatch FAILED kind=${job.kind} status=${res.status}`);
      throw new Error(`background dispatch failed: ${res.status}`);
    }
    return { background: true };
  }

  // Local dev: no background runtime, run inline (the [ingest] lines come from runIngestJob).
  console.log(`[ingest] dispatch kind=${job.kind} -> inline (dev)`);
  await runIngestJob(job);
  return { background: false };
}
