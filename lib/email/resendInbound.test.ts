import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` throws outside a real server bundle; neutralize it for the test.
vi.mock("server-only", () => ({}));

import { fetchReceivedEmail } from "./resendInbound";

/**
 * Regression: Resend inbound returns attachment metadata only. The real bytes
 * are two hops away — GET /attachments/{id} yields JSON with a signed
 * download_url, which then serves the file. An earlier version stopped at the
 * first hop and handed the JSON metadata to Claude as the "PDF".
 */

const ID = "email-1";
const ATT = "att-1";
const CDN = "https://cdn.resend.app/receiving/email-1/att-1?sig=abc";
const PDF = Buffer.from("%PDF-1.4\nfake pdf body\n%%EOF");

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function jsonRes(obj: unknown) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? "application/json; charset=utf-8" : null) },
    json: async () => obj,
    arrayBuffer: async () => toArrayBuffer(body),
    text: async () => body.toString("utf8"),
  };
}

function binRes(buf: Buffer, contentType: string) {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? contentType : null) },
    json: async () => {
      throw new Error("not json");
    },
    arrayBuffer: async () => toArrayBuffer(buf),
    text: async () => buf.toString("utf8"),
  };
}

const emailPayload = (attachment: Record<string, unknown>) => ({
  id: ID,
  from: 'עו"ד דנה <dana@example.com>',
  to: "leads@bst.portfolio-plus.com",
  subject: "הזמנה להציע הצעות",
  text: "גוף המייל",
  attachments: [attachment],
});

beforeEach(() => {
  process.env.RESEND_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchReceivedEmail attachment resolution", () => {
  it("follows metadata → attachment JSON → download_url to the real PDF bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(`/emails/receiving/${ID}`)) {
          return jsonRes(
            emailPayload({ id: ATT, filename: "doc.pdf", content_type: "application/pdf", size: PDF.length }),
          );
        }
        if (url.endsWith(`/emails/receiving/${ID}/attachments/${ATT}`)) {
          return jsonRes({ object: "attachment", id: ATT, filename: "doc.pdf", content_type: "application/pdf", download_url: CDN });
        }
        if (url === CDN) return binRes(PDF, "application/pdf");
        throw new Error("unexpected url " + url);
      }),
    );

    const email = await fetchReceivedEmail(ID);

    expect(email.documents).toHaveLength(1);
    expect(email.documents[0].filename).toBe("doc.pdf");
    expect(email.documents[0].content.equals(PDF)).toBe(true);
    expect(email.otherAttachments).toHaveLength(0);
  });

  it("does not treat unresolved attachment JSON as a document", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(`/emails/receiving/${ID}`)) {
          return jsonRes(
            emailPayload({ id: ATT, filename: "doc.pdf", content_type: "application/pdf", size: 999 }),
          );
        }
        if (url.endsWith(`/emails/receiving/${ID}/attachments/${ATT}`)) {
          // Metadata only — no content, no download_url. Must NOT become a "PDF".
          return jsonRes({ object: "attachment", id: ATT, filename: "doc.pdf", content_type: "application/pdf" });
        }
        throw new Error("unexpected url " + url);
      }),
    );

    const email = await fetchReceivedEmail(ID);

    expect(email.documents).toHaveLength(0);
    expect(email.otherAttachments).toHaveLength(1);
    expect(email.otherAttachments[0].filename).toBe("doc.pdf");
  });

  it("accepts an inline base64 attachment with a data: URL prefix", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(`/emails/receiving/${ID}`)) {
          return jsonRes(
            emailPayload({
              id: ATT,
              filename: "doc.pdf",
              content_type: "application/pdf",
              content: `data:application/pdf;base64,${PDF.toString("base64")}`,
            }),
          );
        }
        throw new Error("unexpected url " + url);
      }),
    );

    const email = await fetchReceivedEmail(ID);

    expect(email.documents).toHaveLength(1);
    expect(email.documents[0].content.equals(PDF)).toBe(true);
  });
});
