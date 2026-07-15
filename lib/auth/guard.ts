/**
 * Auth gate. A single toggle (AUTH_DISABLED=true) bypasses authentication for
 * QA; empty/false means auth is enforced. Keeping this in one helper means the
 * middleware, the dashboard layout, and API routes all agree on the policy.
 */

export function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLED === "true";
}

export const SESSION_COOKIE = "bst_session";
