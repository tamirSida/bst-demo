/**
 * Cheap file storage for lead attachments. Locally, files are written under
 * .data/files/<leadId>/ and served by /api/files. In production on a persistent
 * host this works as-is; on Netlify (ephemeral FS) swap saveLeadFile for a
 * Firebase Storage upload — the returned URL is the only contract the UI needs.
 */

import "server-only";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(process.cwd(), ".data", "files");

/** Keep filenames safe (Hebrew allowed) and collision-free enough for a demo. */
function safeName(name: string): string {
  return basename(name).replace(/[^\w.\-֐-׿ ]/g, "_") || "file";
}

/** Save a file for a lead and return the URL the UI links to. */
export function saveLeadFile(leadId: string, name: string, buf: Buffer): string {
  const file = safeName(name);
  const dir = join(ROOT, leadId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), buf);
  return `/api/files/${encodeURIComponent(leadId)}/${encodeURIComponent(file)}`;
}

/** Read a stored file back (path-traversal safe via basename). */
export function readLeadFile(leadId: string, name: string): Buffer | null {
  const path = join(ROOT, basename(leadId), safeName(name));
  if (!existsSync(path)) return null;
  return readFileSync(path);
}

/** Remove every stored file for a lead (used when the lead is deleted). */
export function deleteLeadFiles(leadId: string): void {
  const dir = join(ROOT, basename(leadId));
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
