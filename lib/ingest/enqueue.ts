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
/**
 * The public origin to dispatch the background function on, or null when there
 * isn't one (local dev) and the job must run inline.
 *
 * Deliberately NOT gated on `process.env.NETLIFY`. That flag is set during the
 * build but is not reliably present in the deployed Next.js server runtime, and
 * when it was missing this fell through to the inline path — running the ~30s
 * AI pipeline inside the webhook request, which then blew past the caller's
 * timeout. Any absolute non-localhost origin means a deployed environment.
 */
function dispatchBase(): string | null {
  const candidates = [process.env.URL, process.env.DEPLOY_URL, process.env.APP_URL];
  for (const raw of candidates) {
    const value = raw?.trim().replace(/\/$/, "");
    if (!value || !/^https?:\/\//i.test(value)) continue;
    if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(value)) continue;
    return value;
  }
  return null;
}

export async function enqueueIngest(job: IngestJob): Promise<{ background: boolean }> {
  const base = dispatchBase();

  if (base) {
    const secret = process.env.INGEST_FUNCTION_SECRET;
    if (!secret) {
      // Fail closed: without a shared secret the endpoint would be unauthenticated.
      console.error("[ingest] dispatch REFUSED kind=" + job.kind + " — INGEST_FUNCTION_SECRET not set");
      throw new Error("INGEST_FUNCTION_SECRET is not set — refusing to dispatch ingest");
    }
    // Netlify answers a "-background" function with 202 and keeps running it.
    console.log(`[ingest] dispatch kind=${job.kind} -> background function`);
    // redirect: "manual" so an auth redirect is visible instead of being
    // silently followed to a 200 on /login — which would look like a
    // successful dispatch while the job was never queued.
    const res = await fetch(`${base}${BG_FUNCTION}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-token": secret },
      body: JSON.stringify(job),
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      console.error(
        `[ingest] dispatch FAILED kind=${job.kind} status=${res.status} — the background ` +
          `function is being redirected (auth middleware?). It must be reachable without a session.`,
      );
      throw new Error(`background dispatch redirected (${res.status}) — check middleware matcher`);
    }
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
