import { describe, expect, it } from "vitest";
import { createLeadsCache } from "./leadsCache";
import type { Lead } from "../domain/types";

/** Minimal Lead stub — the cache only ever touches `id`. */
const lead = (id: string, extra: Partial<Lead> = {}): Lead => ({ id, ...extra }) as Lead;

/** A fetcher that counts calls and returns a controllable book. */
function tracker(initial: Lead[]) {
  let book = initial;
  let calls = 0;
  return {
    fetch: async () => {
      calls += 1;
      return book;
    },
    calls: () => calls,
    setBook: (b: Lead[]) => {
      book = b;
    },
  };
}

describe("createLeadsCache", () => {
  it("fetches once and serves repeat reads from cache within the TTL", async () => {
    const t = tracker([lead("a"), lead("b")]);
    let clock = 1000;
    const cache = createLeadsCache(t.fetch, { ttlMs: 100, now: () => clock });

    await cache.getAll();
    clock = 1050; // still inside the 100ms window
    await cache.getAll();

    expect(t.calls()).toBe(1);
  });

  it("refetches after the TTL expires", async () => {
    const t = tracker([lead("a")]);
    let clock = 0;
    const cache = createLeadsCache(t.fetch, { ttlMs: 100, now: () => clock });

    await cache.getAll();
    clock = 200; // past the window
    await cache.getAll();

    expect(t.calls()).toBe(2);
  });

  it("coalesces concurrent misses into a single fetch", async () => {
    const t = tracker([lead("a")]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 100, now: () => 0 });

    await Promise.all([cache.getAll(), cache.getAll(), cache.getAll()]);

    expect(t.calls()).toBe(1);
  });

  it("prime replaces an existing lead without a refetch", async () => {
    const t = tracker([lead("a", { projectName: "old" }), lead("b")]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 1000, now: () => 0 });

    await cache.getAll();
    cache.prime(lead("a", { projectName: "new" }));
    const after = await cache.getAll();

    expect(t.calls()).toBe(1); // no extra read
    expect(after.find((l) => l.id === "a")?.projectName).toBe("new");
  });

  it("prime adds a new lead to the front", async () => {
    const t = tracker([lead("a")]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 1000, now: () => 0 });

    await cache.getAll();
    cache.prime(lead("z"));
    const after = await cache.getAll();

    expect(after.map((l) => l.id)).toEqual(["z", "a"]);
  });

  it("patch merges onto the cached lead; no-op when absent", async () => {
    const t = tracker([lead("a", { projectName: "old", city: "לוד" })]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 1000, now: () => 0 });

    await cache.getAll();
    cache.patch("a", { projectName: "new" });
    cache.patch("missing", { projectName: "ignored" });
    const after = await cache.getAll();

    const a = after.find((l) => l.id === "a");
    expect(a?.projectName).toBe("new");
    expect(a?.city).toBe("לוד"); // untouched field preserved
    expect(after.some((l) => l.id === "missing")).toBe(false);
  });

  it("remove drops a lead", async () => {
    const t = tracker([lead("a"), lead("b")]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 1000, now: () => 0 });

    await cache.getAll();
    cache.remove("a");
    const after = await cache.getAll();

    expect(after.map((l) => l.id)).toEqual(["b"]);
  });

  it("invalidate forces the next read to refetch", async () => {
    const t = tracker([lead("a")]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 100000, now: () => 0 });

    await cache.getAll();
    t.setBook([lead("a"), lead("c")]);
    cache.invalidate();
    const after = await cache.getAll();

    expect(t.calls()).toBe(2);
    expect(after.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("mutations are no-ops on a cold cache (next read still fetches)", async () => {
    const t = tracker([lead("a")]);
    const cache = createLeadsCache(t.fetch, { ttlMs: 1000, now: () => 0 });

    // No getAll() yet → cache is cold.
    cache.prime(lead("b"));
    cache.remove("a");
    const after = await cache.getAll();

    expect(after.map((l) => l.id)).toEqual(["a"]); // fetched fresh, mutations ignored
  });
});
