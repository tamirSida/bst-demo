import { afterEach, describe, expect, it } from "vitest";
import { applyRedirect, recipientAllowed } from "./providers";

const ENV_KEYS = ["EMAIL_REDIRECT_TO", "EMAIL_ALLOWED_RECIPIENTS"] as const;
const saved: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("recipientAllowed (hard allowlist)", () => {
  it("blocks everyone except the redirect target when allowlist unset", () => {
    delete process.env.EMAIL_ALLOWED_RECIPIENTS;
    process.env.EMAIL_REDIRECT_TO = "safe@example.com";
    expect(recipientAllowed("safe@example.com")).toBe(true);
    expect(recipientAllowed("Yossef@ykadv.co.il")).toBe(false);
  });

  it("blocks everything when neither allowlist nor redirect are set", () => {
    delete process.env.EMAIL_ALLOWED_RECIPIENTS;
    delete process.env.EMAIL_REDIRECT_TO;
    expect(recipientAllowed("anyone@anywhere.com")).toBe(false);
  });

  it("honors exact addresses and @domain suffixes, case-insensitive", () => {
    process.env.EMAIL_ALLOWED_RECIPIENTS = "tamirsida25@gmail.com,@bst.portfolio-plus.com";
    expect(recipientAllowed("tamirsida25@gmail.com")).toBe(true);
    expect(recipientAllowed("TamirSida25@Gmail.com")).toBe(true);
    expect(recipientAllowed("leads@bst.portfolio-plus.com")).toBe(true);
    expect(recipientAllowed("Yossef@ykadv.co.il")).toBe(false);
    expect(recipientAllowed("evil@gmail.com")).toBe(false);
  });

  it('"*" opens everything (explicit production opt-in)', () => {
    process.env.EMAIL_ALLOWED_RECIPIENTS = "*";
    expect(recipientAllowed("Yossef@ykadv.co.il")).toBe(true);
  });
});

describe("applyRedirect", () => {
  it("reroutes to the redirect inbox and names the original recipient", () => {
    process.env.EMAIL_REDIRECT_TO = "safe@example.com";
    const out = applyRedirect({ to: "real@lawyer.co.il", subject: "נושא", text: "גוף" });
    expect(out.to).toBe("safe@example.com");
    expect(out.subject).toContain("[בדיקה]");
    expect(out.text).toContain("real@lawyer.co.il");
  });

  it("is a no-op when unset", () => {
    delete process.env.EMAIL_REDIRECT_TO;
    const out = applyRedirect({ to: "a@b.com", subject: "s", text: "t" });
    expect(out.to).toBe("a@b.com");
  });
});
