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

interface PollState {
  seen: string[];
  attempts: Record<string, number>;
}

function load(): PollState {
  try {
    if (!existsSync(FILE)) return { seen: [], attempts: {} };
    const raw = JSON.parse(readFileSync(FILE, "utf8"));
    // Back-compat: the file used to be a bare array of seen ids.
    if (Array.isArray(raw)) return { seen: raw as string[], attempts: {} };
    return { seen: raw.seen ?? [], attempts: raw.attempts ?? {} };
  } catch {
    return { seen: [], attempts: {} };
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
