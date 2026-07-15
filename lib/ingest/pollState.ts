import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Dedup state for the inbound poller: received-email ids already ingested. */
const FILE = resolve(process.cwd(), ".data", "inbound-seen.json");

export function seenInboundIds(): Set<string> {
  try {
    if (!existsSync(FILE)) return new Set();
    return new Set(JSON.parse(readFileSync(FILE, "utf8")) as string[]);
  } catch {
    return new Set();
  }
}

export function markInboundSeen(ids: string[]): void {
  const all = seenInboundIds();
  for (const id of ids) all.add(id);
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify([...all]), "utf8");
}
