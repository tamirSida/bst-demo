import { describe, expect, it } from "vitest";
import { z } from "zod";
import { applyAdvancedPatch } from "./leadEdit";
import { createLead } from "./lead";
import { DealType, PlanStatus } from "./enums";

const server = () =>
  createLead({
    dealType: DealType.PinuiBinui,
    projectName: "מתחם הבדיקה",
    id: "lead-1",
    threadKey: "BST-L-0007",
    createdAt: "2026-01-01T00:00:00.000Z",
    unitsExisting: 40,
    planStatus: PlanStatus.EarlyProcess,
    extra: { documentTypes: ["invitation"], threadKey: "BST-L-0007" },
  });

describe("applyAdvancedPatch", () => {
  it("applies an edited known fact and marks it touched", () => {
    const { lead, touchedFactKeys } = applyAdvancedPatch(server(), { unitsExisting: 55 });
    expect(lead.unitsExisting).toBe(55);
    expect(touchedFactKeys).toContain("unitsExisting");
  });

  it("never lets input overwrite identity fields", () => {
    const { lead } = applyAdvancedPatch(server(), {
      id: "hacked",
      threadKey: "BST-L-9999",
      createdAt: "1999-01-01",
    });
    expect(lead.id).toBe("lead-1");
    expect(lead.threadKey).toBe("BST-L-0007");
    expect(lead.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("drops computed fields (grade/flags) from input", () => {
    const s = server();
    const { lead } = applyAdvancedPatch(s, { grade: { score: 100 }, flags: [{ id: "fake" }] });
    expect(lead.grade).toBe(s.grade); // unchanged (recomputeTriage owns it downstream)
    expect(lead.flags).toBe(s.flags);
  });

  it("routes unknown top-level keys into extra", () => {
    const { lead, addedExtraKeys } = applyAdvancedPatch(server(), { customField: "hello", another: 5 });
    expect(lead.extra.customField).toBe("hello");
    expect(lead.extra.another).toBe(5);
    expect(addedExtraKeys).toEqual(expect.arrayContaining(["customField", "another"]));
  });

  it("preserves reserved extra keys even if the editor changes them", () => {
    const { lead } = applyAdvancedPatch(server(), {
      extra: { documentTypes: ["HACKED"], threadKey: "nope", mine: 1 },
    });
    expect(lead.extra.documentTypes).toEqual(["invitation"]); // from server, not input
    expect(lead.extra.threadKey).toBe("BST-L-0007"); // from server
    expect(lead.extra.mine).toBe(1); // user addition kept
  });

  it("rejects a wrong-typed known fact (string where a number is required)", () => {
    expect(() => applyAdvancedPatch(server(), { unitsExisting: "forty" })).toThrow(z.ZodError);
  });

  it("rejects an invalid enum value", () => {
    expect(() => applyAdvancedPatch(server(), { planStatus: "bogus_status" })).toThrow(z.ZodError);
  });

  it("accepts a nested contact edit", () => {
    const { lead } = applyAdvancedPatch(server(), {
      contact: { name: "דנה", company: "יזם בע\"מ", firm: null, email: "d@x.co", phone: null },
    });
    expect(lead.contact?.company).toBe('יזם בע"מ');
    expect(lead.contact?.email).toBe("d@x.co");
  });

  it("does not stamp provenance for non-fact editable keys", () => {
    const { touchedFactKeys } = applyAdvancedPatch(server(), {
      projectName: "שם חדש",
      status: "closed",
    });
    expect(touchedFactKeys).toEqual([]);
  });

  it("preserves existing (non-reserved) extra keys on a partial patch", () => {
    const s = createLead({
      dealType: DealType.PinuiBinui,
      projectName: "מ",
      extra: { documentTypes: ["a"], ramiField: "keep-me" },
    });
    const { lead } = applyAdvancedPatch(s, { unitsExisting: 30 });
    expect(lead.extra.ramiField).toBe("keep-me");
    expect(lead.extra.documentTypes).toEqual(["a"]);
  });

  it("won't let an added top-level key override a reserved extra key", () => {
    const { lead } = applyAdvancedPatch(server(), { documentTypes: ["HACKED"] });
    expect(lead.extra.documentTypes).toEqual(["invitation"]);
  });
});
