import { Resend } from "resend";
import type { EmailProvider, SendInput, SendResult } from "./types";

/** Simulated provider — the demo default. Records nothing external. */
export class SimulatedProvider implements EmailProvider {
  readonly name = "simulated";
  async send(input: SendInput): Promise<SendResult> {
    void input;
    return { id: null, status: "simulated" };
  }
}

/**
 * SAFETY LAYER 1 — redirect: while EMAIL_REDIRECT_TO is set, every outbound
 * email is rerouted to that inbox instead of the real recipient, with a test
 * banner naming the original address. Unset it only in production.
 */
export function applyRedirect(input: SendInput): SendInput {
  const redirect = process.env.EMAIL_REDIRECT_TO;
  if (!redirect) return input;
  return {
    ...input,
    to: redirect,
    subject: `[בדיקה] ${input.subject}`,
    text: `*** מייל בדיקה — הנמען המקורי: ${input.to || "(ללא נמען)"} ***\n\n${input.text}`,
  };
}

/**
 * SAFETY LAYER 2 — hard allowlist, enforced in code AFTER the redirect.
 * EMAIL_ALLOWED_RECIPIENTS semantics:
 *   "*"                          → unrestricted (real production, explicit opt-in)
 *   "a@b.com,@some-domain.com"  → only these addresses / domain suffixes
 *   unset                        → only the EMAIL_REDIRECT_TO target (deny-by-default)
 * A blocked recipient never reaches the provider — the send fails loudly.
 */
export function recipientAllowed(to: string): boolean {
  const raw = process.env.EMAIL_ALLOWED_RECIPIENTS?.trim();
  const target = to.trim().toLowerCase();

  if (raw === "*") return true;
  const entries = raw
    ? raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [process.env.EMAIL_REDIRECT_TO?.trim().toLowerCase() ?? ""].filter(Boolean);

  return entries.some((entry) =>
    entry.startsWith("@") ? target.endsWith(entry) : target === entry,
  );
}

/** Live Resend provider. Sends from EMAIL_FROM (e.g. leads@bst-sub.domain). */
export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private client: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(rawInput: SendInput): Promise<SendResult> {
    const input = applyRedirect(rawInput);
    if (!input.to) return { id: null, status: "failed", error: "missing recipient" };
    if (!recipientAllowed(input.to)) {
      return {
        id: null,
        status: "failed",
        error: `blocked by recipient allowlist: ${input.to}`,
      };
    }
    try {
      const res = await this.client.emails.send({
        from: this.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        replyTo: input.replyTo,
        headers: input.headers,
      });
      if (res.error) return { id: null, status: "failed", error: res.error.message };
      return { id: res.data?.id ?? null, status: "sent" };
    } catch (err) {
      return { id: null, status: "failed", error: (err as Error).message };
    }
  }
}

let provider: EmailProvider | null = null;

/**
 * Resolve the outbound provider from env. Live only when EMAIL_LIVE=true AND a
 * Resend key + from-address are present; otherwise simulated (safe by default).
 */
export function emailProvider(): EmailProvider {
  if (provider) return provider;
  const live = process.env.EMAIL_LIVE === "true";
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  provider = live && key && from ? new ResendProvider(key, from) : new SimulatedProvider();
  return provider;
}
