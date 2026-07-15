/**
 * Outbound email abstraction. The pipeline and API routes depend on this
 * interface, never on a concrete provider — so Resend, Mailgun, or a simulated
 * sender are swappable by env with zero code change (Dependency Inversion).
 */

export interface SendInput {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  /** Hidden thread marker etc. — e.g. { "X-BST-Lead": "BST-L-0042" }. */
  headers?: Record<string, string>;
}

export interface SendResult {
  id: string | null;
  status: "sent" | "simulated" | "failed";
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendInput): Promise<SendResult>;
}

/** Normalised inbound email — the shape provider webhooks are mapped into. */
export interface NormalizedInbound {
  raw: Buffer;
}
