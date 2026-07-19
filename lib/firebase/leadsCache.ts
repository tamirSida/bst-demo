/**
 * Server-side cache of the full leads book.
 *
 * The dataset is bounded (~750 leads) and nearly every operation — substring
 * search, gush/helka dedup, thread-key matching — needs the whole set, so
 * Firestore queries/pagination wouldn't help. Instead we read the collection
 * once per TTL window and serve all reads from memory, shared across every
 * request and auto-refresh. Writes update the cache in place, so a new or
 * edited lead shows up immediately without a re-read.
 *
 * Without this, each `listLeads()` did a full-collection read (750 billed
 * reads), multiplied by several calls per page and a 30s auto-refresh timer —
 * enough to drain Firestore's daily free quota from a single open tab.
 *
 * Pure logic, injectable fetcher + clock, so it unit-tests without Firestore.
 */

import type { Lead } from "../domain/types";

export interface LeadsCache {
  /** Full book, from cache when fresh; one fetch per TTL window otherwise. */
  getAll(): Promise<Lead[]>;
  /** Reflect a created/replaced lead without a re-read (upsert by id). */
  prime(lead: Lead): void;
  /** Reflect a partial update by merging onto the cached lead (no-op if absent). */
  patch(id: string, patch: Partial<Lead>): void;
  /** Reflect a deletion. */
  remove(id: string): void;
  /** Force the next getAll() to refetch (e.g. after a bulk write). */
  invalidate(): void;
}

interface Snapshot {
  data: Lead[];
  at: number;
}

export function createLeadsCache(
  fetchAll: () => Promise<Lead[]>,
  opts: { ttlMs?: number; now?: () => number } = {},
): LeadsCache {
  const ttlMs = opts.ttlMs ?? 60_000;
  const now = opts.now ?? (() => Date.now());

  let snap: Snapshot | null = null;
  // Coalesces concurrent misses so a burst of requests triggers one read.
  let inflight: Promise<Lead[]> | null = null;

  async function getAll(): Promise<Lead[]> {
    if (snap && now() - snap.at < ttlMs) return snap.data;
    if (inflight) return inflight;
    inflight = fetchAll()
      .then((data) => {
        snap = { data, at: now() };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  function prime(lead: Lead): void {
    if (!snap) return; // cold cache — the next getAll() will read the write anyway
    const has = snap.data.some((l) => l.id === lead.id);
    const data = has
      ? snap.data.map((l) => (l.id === lead.id ? lead : l))
      : [lead, ...snap.data];
    // Keep the original `at` so the TTL still forces a periodic full refetch
    // (picks up writes made by other server instances).
    snap = { data, at: snap.at };
  }

  function patch(id: string, patch: Partial<Lead>): void {
    if (!snap) return;
    const cur = snap.data.find((l) => l.id === id);
    if (cur) prime({ ...cur, ...patch });
  }

  function remove(id: string): void {
    if (!snap) return;
    snap = { data: snap.data.filter((l) => l.id !== id), at: snap.at };
  }

  function invalidate(): void {
    snap = null;
  }

  return { getAll, prime, patch, remove, invalidate };
}
