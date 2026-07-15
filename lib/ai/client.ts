/**
 * Anthropic client + a single structured-output helper used by every AI step.
 *
 * We standardise on claude-opus-4-8 with `output_config.format` (JSON schema)
 * and validate the returned JSON with the caller's Zod schema — the most
 * version-robust path (no reliance on SDK zod helpers). PDFs are passed as
 * native document blocks so Claude reads scanned Hebrew documents directly.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const MODEL = "claude-opus-4-8";

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "חסר ANTHROPIC_API_KEY. הגדר את המפתח לפני הרצת ניתוח ה-AI.",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** A content block for a user message: text or a base64 PDF document. */
export type UserBlock =
  | { type: "text"; text: string }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
      title?: string;
    };

export interface StructuredCallOptions<T> {
  system: string;
  blocks: UserBlock[];
  schema: z.ZodType<T>;
  /** JSON Schema for output_config.format (from z.toJSONSchema on the same schema). */
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
  /** Enable adaptive thinking for judgment-heavy steps (gap analysis). */
  think?: boolean;
}

/** Run one structured-output call and return the validated object. */
export async function structuredCall<T>(opts: StructuredCallOptions<T>): Promise<T> {
  const client = anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    ...(opts.think ? { thinking: { type: "adaptive" as const } } : {}),
    output_config: {
      format: { type: "json_schema" as const, schema: opts.jsonSchema },
    },
    messages: [{ role: "user", content: opts.blocks }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("תשובת ה-AI אינה מכילה טקסט JSON.");
  }
  const parsed = JSON.parse(textBlock.text);
  return opts.schema.parse(parsed);
}

/** Convenience: build the JSON Schema object the API expects from a Zod schema. */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}
