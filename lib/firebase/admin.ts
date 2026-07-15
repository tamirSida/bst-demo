/**
 * Firebase Admin SDK — server-only. All dashboard data access goes through the
 * admin SDK (server components + API routes), so no broad client Firestore
 * rules are needed. Credentials come from env (Netlify-friendly):
 *   FIREBASE_SERVICE_ACCOUNT  — the service-account JSON (raw or base64)
 * or GOOGLE_APPLICATION_CREDENTIALS — a path (local dev).
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
    process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}
