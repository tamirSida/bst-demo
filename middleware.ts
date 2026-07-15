import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bst_session";

// Paths that never require auth: login, the public form, inbound/form webhooks,
// and the session endpoint itself.
const PUBLIC_PREFIXES = ["/login", "/f/", "/api/forms", "/api/inbound", "/api/session"];

/**
 * Presence-only gate (edge runtime can't run firebase-admin). Real verification
 * happens in the dashboard layout via requireAuth(). Skipped entirely when
 * AUTH_DISABLED=true.
 */
export function middleware(req: NextRequest) {
  if (process.env.AUTH_DISABLED === "true") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
