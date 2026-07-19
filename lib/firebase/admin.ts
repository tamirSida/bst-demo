/**
 * Firebase Admin SDK — server-only. All dashboard data access goes through the
 * admin SDK (server components + API routes), so no broad client Firestore
 * rules are needed. Credentials are read from env, in priority order:
 *   1. FIREBASE_SERVICE_ACCOUNT — the whole service-account JSON (raw or base64).
 *   2. Three separate fields (Netlify-friendly — paste each value on its own):
 *        FIREBASE_PROJECT_ID
 *        FIREBASE_CLIENT_EMAIL
 *        FIREBASE_PRIVATE_KEY   (the -----BEGIN/END PRIVATE KEY----- block;
 *                                literal "\n" escapes are un-escaped for you)
 *   3. GOOGLE_APPLICATION_CREDENTIALS — a path / ADC (local dev).
 */

import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;

function initAdmin(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const creds = JSON.parse(json);
    app = initializeApp({
      credential: cert({
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
      }),
    });
    return app;
  }

  // Separate-field credentials (Netlify-friendly): three individual env vars.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Env stores newlines as literal "\n"; restore real newlines for the PEM.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return app;
  }

  // Falls back to GOOGLE_APPLICATION_CREDENTIALS / ADC.
  app = initializeApp();
  return app;
}

export function adminDb(): Firestore {
  return getFirestore(initAdmin());
}

export function adminAuth(): Auth {
  return getAuth(initAdmin());
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}
