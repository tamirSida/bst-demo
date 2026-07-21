/**
 * Firebase Admin SDK singleton (server-only). All dashboard data access goes
 * through the admin SDK, so no broad client Firestore rules are needed.
 *
 * Credential resolution order (mirrors the `big` project so both deploys share
 * one mental model and the same env-var names):
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON — the whole service-account JSON, raw or
 *      base64. Used on hosted platforms (Netlify), where there is no file on disk.
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH — path to a service-account JSON file on
 *      disk (an alternative local option; gitignored).
 *   3. Inline fields — FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL +
 *      FIREBASE_PRIVATE_KEY. This is what local dev uses (no JSON blob/file).
 * If none resolve, cert() throws a clear error — a misconfiguration fails loudly
 * instead of silently falling back to ambient/ADC credentials.
 */

import "server-only";
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let app: App | undefined;

/**
 * Parse a pasted service-account credential robustly. Accepts either raw JSON or
 * base64-encoded JSON (bulletproof for env vars), and repairs the two classic
 * paste failures: (a) `private_key` left with literal `\n` (double-escaped), and
 * (b) base64 wrapping. firebase-admin's cert() requires real newlines.
 */
function parseServiceAccount(raw: string) {
  let text = raw.trim();
  // Base64 form: doesn't start with '{'. Decode it.
  if (!text.startsWith("{")) {
    try {
      text = Buffer.from(text, "base64").toString("utf8").trim();
    } catch {
      /* fall through to JSON.parse, which will throw a clear error */
    }
  }
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (${
        e instanceof Error ? e.message : e
      }). Paste the exact file contents, or set it base64-encoded.`,
    );
  }
  if (typeof obj.private_key === "string") {
    obj.private_key = obj.private_key.replace(/\\n/g, "\n");
  }
  return obj;
}

function loadCredential() {
  // 1) Hosted: the full service-account JSON (or base64) pasted into an env var.
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson) return cert(parseServiceAccount(saJson));

  // 2) Local: a service-account JSON at a (relative) path on disk.
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath) {
    const json = JSON.parse(readFileSync(resolve(process.cwd(), saPath), "utf8"));
    return cert(json);
  }

  // 3) Inline fields (local dev default). Env stores newlines as literal "\n".
  return cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  });
}

function ensureApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }
  app = initializeApp({ credential: loadCredential() });
  return app;
}

let db: Firestore | undefined;
export function adminDb(): Firestore {
  if (db) return db;
  db = getFirestore(ensureApp());
  // REST transport instead of gRPC: far faster cold starts on serverless
  // (Netlify functions), where a fresh gRPC channel adds ~0.5–1s per invocation.
  // settings() must run once before any operation — safe here (first access).
  try {
    db.settings({ preferRest: true });
  } catch {
    /* already initialized elsewhere — ignore */
  }
  return db;
}

export function adminAuth(): Auth {
  return getAuth(ensureApp());
}

/** True when a credential is configured via any of the three supported paths. */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY),
  );
}
