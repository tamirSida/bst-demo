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

/** Model is env-configurable; defaults to the latest Sonnet. */
export const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

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
  /**
   * JSON Schema for output_config.format. Omit for schemas that exceed the API's
   * 16-union limit — the call then prompts for JSON and parses it leniently.
   */
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  /** Enable adaptive thinking for judgment-heavy steps (gap analysis). */
  think?: boolean;
}

/** Run one structured call and return the Zod-validated object. */
export async function structuredCall<T>(opts: StructuredCallOptions<T>): Promise<T> {
  const client = anthropic();
  const useFormat = Boolean(opts.jsonSchema);

  const blocks = useFormat
    ? opts.blocks
    : [
        ...opts.blocks,
        {
          type: "text" as const,
          text: "החזר אך ורק אובייקט JSON תקין התואם לסכימה שהוגדרה, ללא טקסט נוסף וללא סימוני code fence.",
        },
      ];

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    ...(opts.think ? { thinking: { type: "adaptive" as const } } : {}),
    ...(useFormat
      ? { output_config: { format: { type: "json_schema" as const, schema: opts.jsonSchema! } } }
      : {}),
    messages: [{ role: "user", content: blocks }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("תשובת ה-AI אינה מכילה טקסט JSON.");
  }
  const json = useFormat ? textBlock.text : extractJson(textBlock.text);
  return opts.schema.parse(parseModelJson(json));
}

/**
 * JSON.parse with a fallback for the most common model glitch: literal control
 * characters (newlines/tabs) inside string values, which strict JSON rejects.
 * Replacing them with spaces is safe — whitespace between tokens is legal too.
 */
function parseModelJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (first) {
    try {
      return JSON.parse(json.replace(/[\u0000-\u001f]+/g, " "));
    } catch {
      const msg = (first as Error).message;
      throw new Error(`model JSON parse failed: ${msg}; head: ${json.slice(0, 300)}`);
    }
  }
}

/** Pull the JSON object out of a model response that may wrap it in prose/fences. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return body.trim();
  return body.slice(start, end + 1);
}

/**
 * Build the JSON Schema the API expects from a Zod schema, enforcing
 * `additionalProperties: false` on every object node (structured-outputs
 * requirement). Walks nested objects, arrays and $defs.
 */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  enforceStrict(json);
  return json;
}

function enforceStrict(node: unknown): void {
  if (Array.isArray(node)) {
    node.forEach(enforceStrict);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (obj.type === "object" && obj.properties && obj.additionalProperties === undefined) {
    obj.additionalProperties = false;
  }
  for (const value of Object.values(obj)) enforceStrict(value);
}
