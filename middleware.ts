import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "app_session";

/*
 * Paths that never require a session: login, the public form, the inbound/form
 * webhooks, and the session endpoint itself.
 *
 * `/.netlify/functions` matters as much as the rest. /api/inbound dispatches the
 * ingest to the background function over HTTP, and that request carries no
 * session cookie — so without this the middleware answers it with a 307 to
 * /login, enqueueIngest sees a redirect instead of the 202 it expects, throws,
 * and the webhook 500s with no lead created and nothing obviously wrong.
 * The function is NOT left unprotected: it authenticates every call itself with
 * the INGEST_FUNCTION_SECRET shared secret in `x-ingest-token`, and fails closed.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/f/",
  "/api/forms",
  "/api/inbound",
  "/api/session",
  "/.netlify/functions",
];

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
  // `\.netlify` is excluded here as well as in PUBLIC_PREFIXES: platform
  // function routes should never enter this middleware at all.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.netlify|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
