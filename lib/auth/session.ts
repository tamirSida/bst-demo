import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "../firebase/admin";
import { isAuthDisabled, SESSION_COOKIE } from "./guard";

/**
 * Server-side guard for dashboard pages. When auth is disabled (QA), it's a
 * no-op. Otherwise it verifies the Firebase session cookie and redirects to
 * /login when missing or invalid. redirect() is called OUTSIDE the try so its
 * control-flow throw isn't swallowed by the catch.
 */
export async function requireAuth(): Promise<{ email: string | null }> {
  if (isAuthDisabled()) return { email: null };

  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (cookie) {
    try {
      const decoded = await adminAuth().verifySessionCookie(cookie, true);
      return { email: decoded.email ?? null };
    } catch {
      // fall through to redirect
    }
  }
  redirect("/login");
}
