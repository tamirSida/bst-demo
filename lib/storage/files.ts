/**
 * File storage for lead attachments (PDFs, .eml, form uploads).
 *
 * Two backends, chosen by the presence of `BLOB_READ_WRITE_TOKEN`:
 *  - **Vercel Blob (private store)** in production — bytes live in a Vercel
 *    account that is independent of where the app is hosted (Netlify). The store
 *    is private, so files never have a public URL; they only come back out
 *    through our authenticated `/api/files` route.
 *  - **Local disk** (`.data/files/<leadId>/`) in local dev, when no token is set.
 *
 * The public contract is a `/api/files/<leadId>/<name>` URL — unchanged across
 * both backends, so nothing downstream (LeadDocument.storagePath, the UI) cares
 * which store is active.
 */

import "server-only";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(process.cwd(), ".data", "files");

/** Vercel Blob is active when its token is present (prod / `netlify dev` with the var). */
function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Keep filenames safe (Hebrew allowed) and collision-free enough for a demo. */
function safeName(name: string): string {
  return basename(name).replace(/[^\w.\-֐-׿ ]/g, "_") || "file";
}

/**
 * Blob pathname for a lead file: "<leadId>/<file>". Deterministic (no random
 * suffix) so the read route can address it back from the same leadId + name.
 */
function blobKey(leadId: string, file: string): string {
  return `${basename(leadId)}/${file}`;
}

/** Save a file for a lead and return the URL the UI links to. */
export async function saveLeadFile(leadId: string, name: string, buf: Buffer): Promise<string> {
  const file = safeName(name);

  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    await put(blobKey(leadId, file), buf, {
      access: "private",
      addRandomSuffix: false, // deterministic key — the read route re-derives it
      allowOverwrite: true, // re-ingesting the same attachment just replaces it
    });
  } else {
    const dir = join(ROOT, leadId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, file), buf);
  }

  return `/api/files/${encodeURIComponent(leadId)}/${encodeURIComponent(file)}`;
}

/** Read a stored file back (path-traversal safe via basename). */
export async function readLeadFile(leadId: string, name: string): Promise<Buffer | null> {
  const file = safeName(name);

  if (blobEnabled()) {
    const { get } = await import("@vercel/blob");
    const res = await get(blobKey(leadId, file), { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }

  const path = join(ROOT, basename(leadId), file);
  if (!existsSync(path)) return null;
  return readFileSync(path);
}

/** Remove every stored file for a lead (used when the lead is deleted). */
export async function deleteLeadFiles(leadId: string): Promise<void> {
  if (blobEnabled()) {
    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `${basename(leadId)}/` });
    if (blobs.length) await del(blobs.map((b) => b.pathname));
    return;
  }

  const dir = join(ROOT, basename(leadId));
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
