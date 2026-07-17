import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Dedup state for the inbound poller. `seen` ids are done (ingested, or given up
 * after too many failures). `attempts` counts failures per id so a transient or
 * fixable error is retried a few times instead of being dropped on first sight —
 * while a genuinely poison message still can't wedge the loop forever.
 */
const FILE = resolve(process.cwd(), ".data", "inbound-seen.json");

/** A received email currently being ingested — drives the live dashboard banner. */
export interface InboundProcessing {
  id: string;
  subject: string;
  from: string | null;
  at: string; // ISO — when processing started
}

interface PollState {
  seen: string[];
  attempts: Record<string, number>;
  processing: InboundProcessing[];
}

/** A processing entry older than this is treated as dead (crashed mid-run). */
const STALE_MS = 3 * 60 * 1000;

function load(): PollState {
  try {
    if (!existsSync(FILE)) return { seen: [], attempts: {}, processing: [] };
    const raw = JSON.parse(readFileSync(FILE, "utf8"));
    // Back-compat: the file used to be a bare array of seen ids.
    if (Array.isArray(raw)) return { seen: raw as string[], attempts: {}, processing: [] };
    return { seen: raw.seen ?? [], attempts: raw.attempts ?? {}, processing: raw.processing ?? [] };
  } catch {
    return { seen: [], attempts: {}, processing: [] };
  }
}

function save(state: PollState): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(state), "utf8");
}

export function seenInboundIds(): Set<string> {
  return new Set(load().seen);
}

/** Mark ids as done — clears any failure count so the state stays tidy. */
export function markInboundSeen(ids: string[]): void {
  const state = load();
  for (const id of ids) {
    if (!state.seen.includes(id)) state.seen.push(id);
    delete state.attempts[id];
  }
  save(state);
}

/** Record a failed ingest attempt for an id; returns the new attempt count. */
export function recordInboundFailure(id: string): number {
  const state = load();
  const next = (state.attempts[id] ?? 0) + 1;
  state.attempts[id] = next;
  save(state);
  return next;
}

/** Emails currently being ingested (stale entries filtered out). */
export function getProcessing(): InboundProcessing[] {
  const now = Date.now();
  return load().processing.filter((p) => now - Date.parse(p.at) < STALE_MS);
}

/** Ids currently being ingested — used as an in-flight lock across poll cycles. */
export function processingIds(): Set<string> {
  return new Set(getProcessing().map((p) => p.id));
}

/** Mark an email as in-flight (shown on the dashboard, and skipped by other polls). */
export function startProcessing(entry: InboundProcessing): void {
  const state = load();
  if (!state.processing.some((p) => p.id === entry.id)) state.processing.push(entry);
  save(state);
}

/** Clear the in-flight marker once ingestion finishes (success or give-up). */
export function endProcessing(id: string): void {
  const state = load();
  state.processing = state.processing.filter((p) => p.id !== id);
  save(state);
}
