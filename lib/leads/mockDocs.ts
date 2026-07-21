import type { Lead } from "@/lib/domain/types";

/**
 * Seeded MOCK compound documents for the demo (valuation, planning, condo
 * register). Like the נסח, these are clearly-labeled demo documents — never real
 * records — and everything is derived deterministically from the lead id so a
 * lead always renders the same figures.
 */

export type MockDocType = "tabu" | "shuma" | "tochnit" | "tabatz";

export const MOCK_DOCS: { type: MockDocType; label: string }[] = [
  { type: "tabu", label: "נסח טאבו" },
  { type: "shuma", label: "שומת מקרקעין" },
  { type: "tochnit", label: 'מצב תכנוני (תב"ע)' },
  { type: "tabatz", label: "תשריט בית משותף" },
];

export const DOC_META: Record<MockDocType, { title: string; subtitle: string }> = {
  tabu: { title: "נסח רישום מקרקעין", subtitle: "לשכת רישום המקרקעין · נסח מלא (הדגמה)" },
  shuma: { title: "שומת מקרקעין", subtitle: "הערכת שווי לצורכי בדיקת היתכנות (הדגמה)" },
  tochnit: { title: "מצב תכנוני", subtitle: 'תב"ע וזכויות בנייה (הדגמה)' },
  tabatz: { title: "תשריט בית משותף", subtitle: "רישום הבית המשותף (הדגמה)" },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function gushHelkaLine(lead: Lead): string {
  return (lead.gushHelka ?? []).filter(Boolean).join(" · ") || "—";
}

const nis = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₪`;

function issuedNow(): string {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

/* ------------------------------ שומת מקרקעין ------------------------------ */

export interface DocRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

export interface MockShuma {
  docNumber: string;
  issuedAt: string;
  gushHelka: string;
  address: string | null;
  rows: DocRow[];
  assumptions: string[];
}

export function buildMockShuma(lead: Lead): MockShuma {
  const seed = hash(lead.id);
  const existing = lead.unitsExisting ?? 54;
  const planned = lead.unitsPlanned ?? Math.round(existing * 2.2);
  const sellable = Math.max(planned - existing, 0);

  const existingUnitValue = 1_600_000 + (seed % 5) * 100_000; // 1.6–2.0M
  const newUnitValue = existingUnitValue + 700_000 + (seed % 4) * 100_000; // higher
  const buildCostPerUnit = 850_000 + (seed % 4) * 50_000; // 0.85–1.0M

  const revenue = sellable * newUnitValue;
  const buildCost = planned * buildCostPerUnit;
  const softCost = Math.round(buildCost * 0.15);
  const totalCost = buildCost + softCost;
  const ownerConsideration = existing * newUnitValue;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? profit / revenue : 0;
  const multiplier = existing > 0 ? planned / existing : 0;

  return {
    docNumber: `SH-${(seed % 9000) + 1000}`,
    issuedAt: issuedNow(),
    gushHelka: gushHelkaLine(lead),
    address: [lead.address, lead.city].filter(Boolean).join(", ") || null,
    rows: [
      { label: 'יח"ד קיימות', value: existing.toLocaleString("en-US") },
      { label: 'יח"ד מתוכננות', value: planned.toLocaleString("en-US") },
      { label: 'יח"ד למכירה (חלק היזם)', value: sellable.toLocaleString("en-US") },
      { label: "מכפיל כלכלי", value: multiplier.toFixed(2) },
      { label: "שווי דירה קיימת (ממוצע)", value: nis(existingUnitValue) },
      { label: "שווי דירה חדשה (ממוצע)", value: nis(newUnitValue) },
      { label: 'עלות בנייה ליח"ד', value: nis(buildCostPerUnit) },
      { label: "תמורה לבעלים (שווי דירות חלופיות)", value: nis(ownerConsideration) },
      { label: "הכנסות ממכירת דירות היזם", value: nis(revenue) },
      { label: "עלויות בנייה ופיתוח (כולל נלוות)", value: nis(totalCost) },
      { label: "רווח יזמי צפוי", value: nis(profit), emphasis: true },
      { label: "שיעור רווח", value: `${(margin * 100).toFixed(1)}%`, emphasis: true },
    ],
    assumptions: [
      "השומה נערכה בגישת ההשוואה והחילוץ, לצורכי בדיקת היתכנות ראשונית בלבד.",
      "הערכים הם ממוצעים משוקללים ואינם כוללים מע\"מ, היטלים ומיסוי מקרקעין.",
      "אין במסמך זה כדי להוות שומה מכרעת או חוות דעת שמאי מוסמך.",
    ],
  };
}

/* ------------------------------ מצב תכנוני ------------------------------ */

const PLAN_STATUS_LABEL: Record<string, string> = {
  approved: "תב\"ע מאושרת",
  deposited: "בהפקדה",
  submitted: "הוגשה",
  pre: "טרום תכנון",
  unknown: "לא ידוע",
};

export interface MockTochnit {
  docNumber: string;
  issuedAt: string;
  gushHelka: string;
  address: string | null;
  rows: DocRow[];
  notes: string[];
}

export function buildMockTochnit(lead: Lead): MockTochnit {
  const seed = hash(lead.id);
  const planned = lead.unitsPlanned ?? Math.round((lead.unitsExisting ?? 54) * 2.2);
  const floors = 12 + (seed % 14); // 12–25
  const buildPct = 250 + (seed % 6) * 25; // 250–375%
  const coverage = 35 + (seed % 3) * 5; // 35–45%
  const status = PLAN_STATUS_LABEL[lead.planStatus ?? "unknown"] ?? "לא ידוע";

  return {
    docNumber: `TB-${(seed % 9000) + 1000}`,
    issuedAt: issuedNow(),
    gushHelka: gushHelkaLine(lead),
    address: [lead.address, lead.city].filter(Boolean).join(", ") || null,
    rows: [
      { label: "מספר תב\"ע", value: lead.planNumber ?? `${5000 + (seed % 4000)}` },
      { label: "סטטוס תכנוני", value: status },
      { label: "ייעוד קרקע", value: "מגורים ומסחר (בייעוד מעורב)" },
      { label: 'יח"ד מאושרות', value: planned.toLocaleString("en-US") },
      { label: "מספר קומות מותר", value: `${floors}` },
      { label: "אחוזי בנייה", value: `${buildPct}%`, emphasis: true },
      { label: "תכסית מרבית", value: `${coverage}%` },
      { label: "קו בניין (חזית/צד)", value: "5 מ' / 3 מ'" },
    ],
    notes: [
      "הנתונים מרוכזים ממערכות התכנון לצורכי בדיקה ראשונית (הדגמה).",
      "יש לאמת את זכויות הבנייה מול הוועדה המקומית לפני קבלת החלטה.",
    ],
  };
}

/* --------------------------- תשריט בית משותף --------------------------- */

export interface TabatzUnit {
  subParcel: string; // תת-חלקה
  floor: string;
  areaSqm: number;
  rooms: number;
  attached: string; // צמידויות
}

export interface MockTabatz {
  docNumber: string;
  issuedAt: string;
  gushHelka: string;
  totalUnits: number;
  units: TabatzUnit[];
}

export function buildMockTabatz(lead: Lead): MockTabatz {
  const seed = hash(lead.id);
  const total = lead.unitsExisting ?? 54;
  const sample = Math.min(total, 6);
  const units: TabatzUnit[] = Array.from({ length: sample }, (_, i) => {
    const s = (seed + i * 13) >>> 0;
    return {
      subParcel: `${i + 1}`,
      floor: `${(i % 5) + 1}`,
      areaSqm: 62 + (s % 40), // 62–101
      rooms: 3 + (s % 3), // 3–5
      attached: s % 2 === 0 ? "חניה + מחסן" : "חניה",
    };
  });

  return {
    docNumber: `BM-${(seed % 9000) + 1000}`,
    issuedAt: issuedNow(),
    gushHelka: gushHelkaLine(lead),
    totalUnits: total,
    units,
  };
}
