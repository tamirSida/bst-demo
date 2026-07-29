/**
 * Shared store for inbound "currently being ingested" markers — what drives the
 * live "מתקבל ליד חדש" banner on the dashboard.
 *
 * This CANNOT be file-backed. On Netlify the three parties involved are three
 * separate function invocations that share no filesystem:
 *   1. `/api/inbound`            — the webhook, writes the marker
 *   2. `ingest-background.mts`   — the 15-min background function, clears it
 *   3. `/api/inbound/processing` — the endpoint the dashboard polls, reads it
 * (and `process.cwd()` is read-only there anyway — a write would throw EROFS).
 * Firestore is the one thing all three already talk to, so the marker lives
 * there. In seed mode (no Firebase creds) we fall back to the dev JSON file,
 * which is enough because dev runs everything in one process tree.
 */

import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { adminDb, isAdminConfigured } from "../firebase/admin";

/** A received email currently being ingested. */
export interface InboundProcessing {
  id: string;
  subject: string;
  from: string | null;
  at: string; // ISO — when processing started
}

const COLLECTION = "inboundProcessing";
const FILE = resolve(process.cwd(), ".data", "inbound-processing.json");

/** A marker older than this is treated as dead (function crashed mid-run). */
const STALE_MS = 3 * 60 * 1000;

const fromSeed = () => !isAdminConfigured();

function readFile(): InboundProcessing[] {
  try {
    if (!existsSync(FILE)) return [];
    return JSON.parse(readFileSync(FILE, "utf8")) as InboundProcessing[];
  } catch {
    return [];
  }
}

function writeFile(rows: InboundProcessing[]): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(rows), "utf8");
}

function fresh(rows: InboundProcessing[]): InboundProcessing[] {
  const now = Date.now();
  return rows.filter((p) => now - Date.parse(p.at) < STALE_MS);
}

/*
 * Read cache. The dashboard polls this constantly and the answer is almost
 * always "nothing in flight", so an uncached read would burn a Firestore read
 * every couple of seconds per open tab — enough to exhaust the free-tier daily
 * quota on its own. Cache briefly, and cache an EMPTY result longer than a busy
 * one: when nothing is happening a few seconds of staleness costs nothing, but
 * once an email is in flight we want the banner to track it closely.
 */
let cache: { at: number; rows: InboundProcessing[] } | null = null;
const CACHE_IDLE_MS = 8_000;
const CACHE_BUSY_MS = 1_500;

/** Drop the cache after a write so the next poll reflects it immediately. */
function invalidate(): void {
  cache = null;
}

/** Emails currently being ingested (stale markers filtered out). */
export async function getProcessing(): Promise<InboundProcessing[]> {
  if (cache) {
    const ttl = cache.rows.length ? CACHE_BUSY_MS : CACHE_IDLE_MS;
    if (Date.now() - cache.at < ttl) return cache.rows;
  }
  const rows = fromSeed()
    ? fresh(readFile())
    : fresh((await adminDb().collection(COLLECTION).get()).docs.map((d) => d.data() as InboundProcessing));
  cache = { at: Date.now(), rows };
  return rows;
}

/** Ids currently in flight — also acts as a lock so a poll can't double-ingest. */
export async function processingIds(): Promise<Set<string>> {
  return new Set((await getProcessing()).map((p) => p.id));
}

/**
 * Mark an email as in-flight. Called the instant we learn an email exists, so
 * the banner appears immediately rather than after the ~30s AI pipeline.
 * `subject`/`from` may be unknown at webhook time — enrich later via this same
 * call (it merges), once the email has actually been fetched.
 */
export async function startProcessing(entry: InboundProcessing): Promise<void> {
  invalidate();
  if (fromSeed()) {
    const rows = readFile();
    const at = rows.findIndex((p) => p.id === entry.id);
    if (at >= 0) rows[at] = { ...rows[at], ...entry };
    else rows.push(entry);
    writeFile(rows);
    return;
  }
  await adminDb().collection(COLLECTION).doc(entry.id).set(entry, { merge: true });
}

/** Clear the marker once ingestion finishes (success or give-up). */
export async function endProcessing(id: string): Promise<void> {
  invalidate();
  if (fromSeed()) {
    writeFile(readFile().filter((p) => p.id !== id));
    return;
  }
  await adminDb().collection(COLLECTION).doc(id).delete();
}
