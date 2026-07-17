import { describe, expect, it } from "vitest";
import { DealType, FlagSeverity, LeadSourceType, PlanStatus, Verdict } from "./enums";
import { DEFAULT_CONFIG } from "./config";
import { createLead, recomputeTriage } from "./lead";
import { businessDaysBetween } from "./compute";
import { FeeStructure } from "./enums";
import type { Lead } from "./types";

function severities(lead: Lead): Set<string> {
  return new Set(lead.flags.map((f) => `${f.id}:${f.severity}`));
}
function flagIds(lead: Lead): Set<string> {
  return new Set(lead.flags.map((f) => f.id));
}

/* ------------------------------------------------------------------ */
/* Israeli business-day math (Sun–Thu work week)                       */
/* ------------------------------------------------------------------ */

describe("businessDaysBetween (Israeli week)", () => {
  const sunday = (() => {
    const d = new Date(2026, 0, 1);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    return d;
  })();

  it("counts Sun→Thu as 4 business days", () => {
    const thu = new Date(sunday);
    thu.setDate(sunday.getDate() + 4);
    expect(businessDaysBetween(sunday, thu)).toBe(4);
  });

  it("skips Fri+Sat across a full week", () => {
    const nextSun = new Date(sunday);
    nextSun.setDate(sunday.getDate() + 7);
    expect(businessDaysBetween(sunday, nextSun)).toBe(5);
  });

  it("is signed (past deadline is negative)", () => {
    const prevThu = new Date(sunday);
    prevThu.setDate(sunday.getDate() - 3); // Thursday before
    expect(businessDaysBetween(sunday, prevThu)).toBeLessThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* The real הדרים 21-23 לוד lead                                        */
/* ------------------------------------------------------------------ */

describe("הדרים 21-23 לוד — the reference lead", () => {
  const hadarim = recomputeTriage(
    createLead({
      dealType: DealType.PinuiBinui,
      projectName: "הדרים 21-23",
      city: "לוד",
      unitsExisting: 36,
      lotAreaDunam: 5.6,
      planStatus: PlanStatus.ApprovedMitcham,
      planNumber: "406-1063890",
      sourceType: LeadSourceType.TenantLawyer,
      contact: { name: "יוסף קדוש", company: null, firm: "יוסף קדוש", email: "y@x.co.il", phone: "050" },
    }),
    DEFAULT_CONFIG,
  );

  it("flags low density as GREEN (6.4 יח\"ד/דונם)", () => {
    expect(severities(hadarim)).toContain(`density_low:${FlagSeverity.Green}`);
  });

  it("flags approved plan as GREEN", () => {
    expect(severities(hadarim)).toContain(`plan_approved:${FlagSeverity.Green}`);
  });

  it("treats לוד as a target city (registered in מאגר → no red)", () => {
    expect(flagIds(hadarim)).toContain("city_target");
    expect(flagIds(hadarim)).not.toContain("maagar_not_registered");
  });

  it("has no kill or red flags → economics-ready", () => {
    expect(hadarim.grade?.economicsReady).toBe(true);
    expect(hadarim.grade?.verdict).toBe(Verdict.Advance);
    expect(hadarim.grade?.score).toBeGreaterThanOrEqual(70);
  });
});

/* ------------------------------------------------------------------ */
/* Kill / red edge cases                                               */
/* ------------------------------------------------------------------ */

describe("kill and red rules", () => {
  it("kills a פינוי-בינוי below the 24-unit floor", () => {
    const lead = recomputeTriage(
      createLead({ dealType: DealType.PinuiBinui, projectName: "קטן", city: "לוד", unitsExisting: 20 }),
      DEFAULT_CONFIG,
    );
    expect(flagIds(lead)).toContain("below_legal_minimum");
    expect(lead.grade?.verdict).toBe(Verdict.Killed);
    expect(lead.grade?.score).toBeNull();
  });

  it("reds very-high existing density", () => {
    const lead = recomputeTriage(
      createLead({
        dealType: DealType.PinuiBinui,
        projectName: "צפוף",
        city: "לוד",
        unitsExisting: 120,
        lotAreaDunam: 3,
      }),
      DEFAULT_CONFIG,
    );
    expect(severities(lead)).toContain(`density_very_high:${FlagSeverity.Red}`);
    expect(lead.grade?.verdict).toBe(Verdict.Curable);
    expect(lead.grade?.economicsReady).toBe(false);
  });

  it("kills when developer share is below 40%", () => {
    const lead = recomputeTriage(
      createLead({
        dealType: DealType.PinuiBinui,
        projectName: "יחס גרוע",
        city: "לוד",
        unitsExisting: 40,
        unitsPlanned: 100,
        developerUnits: 30,
      }),
      DEFAULT_CONFIG,
    );
    expect(flagIds(lead)).toContain("developer_share_kill");
    expect(lead.grade?.verdict).toBe(Verdict.Killed);
  });
});

/* ------------------------------------------------------------------ */
/* Deadline + source-fee behaviour                                     */
/* ------------------------------------------------------------------ */

describe("deadline and source fee", () => {
  it("reds an impossible deadline (2 business days out)", () => {
    const soon = new Date();
    // push ~2 calendar days but into a weekday range — assert red regardless
    soon.setDate(soon.getDate() + 2);
    const lead = recomputeTriage(
      createLead({
        dealType: DealType.PinuiBinui,
        projectName: "דחוף",
        city: "לוד",
        unitsExisting: 40,
        submissionDeadline: soon.toISOString(),
      }),
      DEFAULT_CONFIG,
    );
    const dl = lead.flags.find((f) => f.id.startsWith("deadline"));
    expect(dl).toBeTruthy();
  });

  it("reds a source fee above the red per-unit threshold", () => {
    const lead = recomputeTriage(
      createLead({
        dealType: DealType.PinuiBinui,
        projectName: "עמלה",
        city: "לוד",
        unitsExisting: 40,
        sourceFee: { amount: 40000, currency: "ILS", structure: FeeStructure.PerUnit, note: null },
      }),
      DEFAULT_CONFIG,
    );
    expect(flagIds(lead)).toContain("source_fee_high");
    expect(lead.grade?.economicsReady).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Purity — recomputeTriage never mutates its input                    */
/* ------------------------------------------------------------------ */

describe("purity", () => {
  it("returns a new lead and leaves the input untouched", () => {
    const input = createLead({
      dealType: DealType.PinuiBinui,
      projectName: "טוהר",
      city: "לוד",
      unitsExisting: 36,
      lotAreaDunam: 5.6,
    });
    const before = JSON.stringify(input);
    const out = recomputeTriage(input, DEFAULT_CONFIG);
    expect(JSON.stringify(input)).toBe(before);
    expect(out).not.toBe(input);
    expect(out.flags.length).toBeGreaterThan(0);
  });
});
