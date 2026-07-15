import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/auth/guard";

export const runtime = "nodejs";

const EXPIRES_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/** Exchange a Firebase ID token for an HttpOnly session cookie. */
export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) return NextResponse.json({ error: "missing idToken" }, { status: 400 });

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: EXPIRES_MS,
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: EXPIRES_MS / 1000,
      path: "/",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

/** Sign out — clear the session cookie. */
export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
