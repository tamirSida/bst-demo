import { describe, expect, it, vi } from "vitest";

// buildManualEmail is pure; stub the server-only guard and the ingest wrapper's
// import so the module loads without the repo/AI chain.
vi.mock("server-only", () => ({}));
vi.mock("./run", () => ({ ingestParsedEmail: vi.fn() }));

import { buildManualEmail, ManualInputError, type ManualFileInput } from "./manual";

const file = (filename: string, contentType: string, body: string): ManualFileInput => ({
  filename,
  contentType,
  content: Buffer.from(body, "utf8"),
});

describe("buildManualEmail", () => {
  it("uses pasted text as the body and the first short line as the subject", () => {
    const email = buildManualEmail({ text: "מתחם הרצל 5\n40 יח\"ד, 5 דונם" });
    expect(email.text).toBe("מתחם הרצל 5\n40 יח\"ד, 5 דונם");
    expect(email.subject).toBe("מתחם הרצל 5");
    expect(email.documents).toHaveLength(0);
    expect(email.fromEmail).toBeNull();
    expect(email.references).toEqual([]);
  });

  it("folds a .txt / plain-text file into the body (model reads it)", () => {
    const email = buildManualEmail({ files: [file("notes.txt", "text/plain", "פרטי מתחם")] });
    expect(email.text).toContain("פרטי מתחם");
    expect(email.documents).toHaveLength(0);
  });

  it("routes a PDF to documents, not the body", () => {
    const email = buildManualEmail({ files: [file("tender.pdf", "application/pdf", "%PDF-1.4")] });
    expect(email.documents).toHaveLength(1);
    expect(email.documents[0].filename).toBe("tender.pdf");
    expect(email.subject).toBe("tender.pdf");
  });

  it("keeps images as metadata-only and, with no text, throws ManualInputError", () => {
    expect(() => buildManualEmail({ files: [file("logo.png", "image/png", "\x89PNG")] })).toThrow(
      ManualInputError,
    );
  });

  it("throws ManualInputError when there is no text and no document", () => {
    expect(() => buildManualEmail({ text: "   " })).toThrow(ManualInputError);
    expect(() => buildManualEmail({})).toThrow(ManualInputError);
  });

  it("falls back to a generic subject for a long single-line run-on paste", () => {
    const longLine = "פרויקט פינוי בינוי ".repeat(10); // > 80 chars, single line
    const email = buildManualEmail({ text: longLine });
    expect(email.subject).toBe("ליד ידני");
  });

  it("combines pasted text and a PDF in one lead", () => {
    const email = buildManualEmail({
      text: "לידיעתכם",
      files: [file("a.pdf", "application/pdf", "%PDF")],
    });
    expect(email.text).toBe("לידיעתכם");
    expect(email.documents).toHaveLength(1);
  });
});
