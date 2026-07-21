import type { Lead } from "@/lib/domain/types";

/**
 * Seeded MOCK נסח טאבו (land-registry extract) for the demo. This is NOT a real
 * registry extract and must always be presented as a clearly-labeled demo — the
 * page that renders it stamps "מסמך הדגמה · אינו נסח רשמי" and shows no state
 * seal. Owner names are the Israeli placeholder equivalents of "John Doe" and
 * IDs are redacted, so nothing here is a real person's record.
 *
 * Everything is derived deterministically from the lead id, so a given lead
 * always produces the same document (stable for screenshots / re-opens).
 */

export interface TabuOwner {
  name: string;
  idMasked: string;
  share: string; // e.g. "1/4"
  right: string; // מהות הזכות
}

export interface TabuLien {
  holder: string;
  amount: string;
  date: string;
}

export interface MockTabu {
  extractNumber: string;
  issuedAt: string; // formatted Hebrew date
  parcels: string[]; // גוש/חלקה lines
  gush: string | null;
  helka: string | null;
  areaSqm: number | null;
  address: string | null;
  city: string | null;
  owners: TabuOwner[];
  liens: TabuLien[];
  notes: string[];
}

// Placeholder ("ישראל ישראלי" = the Israeli John Doe) — clearly demo names.
const NAMES = [
  "ישראל ישראלי",
  "שרה כהן",
  "דוד לוי",
  "רחל אברהם",
  "משה פרץ",
  "יעל ביטון",
  "אבי מזרחי",
  "נעמי דהן",
];
const BANKS = [
  "בנק לאומי למשכנתאות בע\"מ",
  "בנק הפועלים בע\"מ",
  "בנק מזרחי טפחות בע\"מ",
  "בנק דיסקונט למשכנתאות בע\"מ",
];
const SHARE_SPLITS: Record<number, string[]> = {
  3: ["1/2", "1/4", "1/4"],
  4: ["1/4", "1/4", "1/4", "1/4"],
  5: ["1/3", "1/6", "1/6", "1/6", "1/6"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Pull the first "גוש N חלקה M" pair out of the lead's gushHelka strings. */
function parseGushHelka(list: string[]): { gush: string | null; helka: string | null } {
  for (const s of list) {
    const g = s.match(/גוש\s*([0-9]+)/);
    const h = s.match(/חלקה\s*([0-9]+)/);
    if (g || h) return { gush: g?.[1] ?? null, helka: h?.[1] ?? null };
  }
  return { gush: null, helka: null };
}

export function buildMockTabu(lead: Lead): MockTabu {
  const seed = hash(lead.id);
  const { gush, helka } = parseGushHelka(lead.gushHelka ?? []);

  const ownerCount = 3 + (seed % 3); // 3–5
  const shares = SHARE_SPLITS[ownerCount] ?? SHARE_SPLITS[4];
  const owners: TabuOwner[] = shares.map((share, i) => {
    const name = NAMES[(seed + i * 3) % NAMES.length];
    const last2 = String((seed + i * 17) % 100).padStart(2, "0");
    return {
      name,
      idMasked: `ת.ז. •••••••${last2}`,
      share,
      right: "בעלות",
    };
  });

  const hasLien = seed % 2 === 0;
  const liens: TabuLien[] = hasLien
    ? [
        {
          holder: BANKS[seed % BANKS.length],
          amount: `${(600 + (seed % 900)).toLocaleString("en-US")},000 ₪`,
          date: `0${1 + (seed % 8)}/0${1 + (seed % 9)}/2021`,
        },
      ]
    : [];

  const areaSqm = lead.lotAreaDunam ? Math.round(lead.lotAreaDunam * 1000) : null;

  const notes = [
    "הערת אזהרה לפי סעיף 126 לחוק המקרקעין — לטובת עסקת התחדשות עירונית (פינוי-בינוי).",
  ];
  if (seed % 3 === 0) {
    notes.push("הערה: המקרקעין כלולים במתחם המיועד להתחדשות עירונית.");
  }

  const now = new Date();
  const issuedAt = new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  return {
    extractNumber: `${gush ?? "0000"}-${helka ?? "000"}-${(seed % 9000) + 1000}`,
    issuedAt,
    parcels: (lead.gushHelka ?? []).filter(Boolean),
    gush,
    helka,
    areaSqm,
    address: [lead.address, lead.city].filter(Boolean).join(", ") || null,
    city: lead.city ?? null,
    owners,
    liens,
    notes,
  };
}
