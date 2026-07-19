import { NextResponse } from "next/server";

// TEMP diagnostic — public (matches the /api/session middleware prefix). Reveals
// exactly where firebase-admin fails on the deploy. Remove after diagnosing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const trace: Record<string, unknown> = {};
  try {
    trace.step = "importing admin";
    const { adminDb, adminAuth, isAdminConfigured } = await import("@/lib/firebase/admin");
    trace.imported = true;
    trace.isAdminConfigured = isAdminConfigured();
    trace.envSeen = {
      FIREBASE_SERVICE_ACCOUNT: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? null,
      FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY_len: (process.env.FIREBASE_PRIVATE_KEY ?? "").length,
    };
    trace.step = "adminAuth()";
    adminAuth();
    trace.step = "firestore read";
    const snap = await adminDb().collection("leads").limit(1).get();
    trace.leadSample = snap.size;
    return NextResponse.json({ ok: true, ...trace });
  } catch (err) {
    return NextResponse.json(
      { ok: false, ...trace, error: (err as Error).message, stack: (err as Error).stack?.split("\n").slice(0, 8) },
      { status: 500 },
    );
  }
}
