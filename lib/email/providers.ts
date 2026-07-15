import { Resend } from "resend";
import type { EmailProvider, SendInput, SendResult } from "./types";

/** Simulated provider — the demo default. Records nothing external. */
export class SimulatedProvider implements EmailProvider {
  readonly name = "simulated";
  async send(_input: SendInput): Promise<SendResult> {
    return { id: null, status: "simulated" };
  }
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

  async send(input: SendInput): Promise<SendResult> {
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
