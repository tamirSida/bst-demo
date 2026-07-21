/**
 * Triage configuration — every threshold the flags engine uses.
 *
 * This is the single source of truth for all "business numbers". It is stored
 * in Firestore (`config/thresholds`) and editable from the הגדרות screen, so
 * management can tune the machine without a code change. DEFAULT_CONFIG holds
 * seed values grounded in the Israeli urban-renewal market.
 */

/** Region buckets used for multiplier / price floors. */
export const Region = {
  Prime: "prime",
  GushDanSharon: "gush_dan_sharon",
  PeripheryNear: "periphery_near",
  PeripheryWeak: "periphery_weak",
} as const;
export type Region = (typeof Region)[keyof typeof Region];

export const REGION_LABEL: Record<Region, string> = {
  [Region.Prime]: "ביקוש גבוה (מרכז)",
  [Region.GushDanSharon]: 'טבעת גוש דן / השרון',
  [Region.PeripheryNear]: "פריפריה קרובה",
  [Region.PeripheryWeak]: "פריפריה",
};

export interface TriageConfig {
  /** פינוי-בינוי unit thresholds. */
  pinuiBinuiMinUnits: number; // below → kill
  smallMitchamMaxUnits: number; // 24..this → yellow

  /** תמ"א 38/2 unit band. */
  tamaMinUnits: number;
  tamaMaxUnits: number; // above → suggest reclassify to pinui-binui

  /** Multiplier (planned/existing) floor per region. Below → red/yellow. */
  multiplierFloor: Record<Region, number>;

  /** Existing density (units per dunam). */
  densityLowGreen: number; // below → green (headroom)
  densityHighYellow: number; // above → yellow
  densityHighRed: number; // above → red

  /** Developer share of new units (developerUnits / unitsPlanned). */
  developerShareRed: number;
  developerShareKill: number;

  /** Deadline windows in business days. */
  deadlineImpossibleDays: number; // below → red-curable
  deadlineTightDays: number; // below → yellow

  /** Source-fee thresholds (what the referrer charges). */
  feeYellowPerUnit: number;
  feeRedPerUnit: number;
  feeYellowPct: number; // e.g. 0.02 = 2%
  feeRedPct: number;
  feeYellowFixed: number;
  feeRedFixed: number;

  /** City strategy lists. */
  cityBlacklist: string[];
  cityWhitelist: string[]; // target cities
  maagarRequiredCities: string[]; // cities requiring מאגר יזמים registration
  registeredMaagarCities: string[]; // where BST IS registered

  /** City → region classification (fallback = defaultRegion). */
  cityRegion: Record<string, Region>;
  defaultRegion: Region;

  /** Composite-score weights (must sum ~1). */
  weights: {
    economics: number;
    planning: number;
    seriousness: number;
    strategic: number;
    timeline: number;
  };

  /** Verdict bands on the 0–100 score. */
  advanceAt: number; // >= → advance
  reviewAt: number; // >= → review; below → reject

  /** Behavior: auto-generate + send the follow-up questions form on a new lead. */
  autoSendQuestions: boolean;

  /** "לידים חדשים" window: a lead counts as new for this many days after arrival. */
  newLeadWindowDays: number;

  /** When false, hide seeded/demo leads everywhere — show only email/upload leads. */
  showSeedData: boolean;

  /** שאלון יזם auto-gate: existing density (יח"ד/דונם) at/above which a lead's
   * developer questionnaire is auto-prepared. */
  yazamGateDensity: number;

  /** BST's standing answers to the company-level שאלון יזם questions, keyed by
   * question key (see lib/leads/yazamQuestions). Entered once, reused verbatim
   * across every tender; deal-specific questions are flagged for manual review. */
  yazamAnswers: Record<string, string>;
}

export const DEFAULT_CONFIG: TriageConfig = {
  pinuiBinuiMinUnits: 24,
  smallMitchamMaxUnits: 60,

  tamaMinUnits: 12,
  tamaMaxUnits: 40,

  multiplierFloor: {
    [Region.Prime]: 2.3,
    [Region.GushDanSharon]: 3.0,
    [Region.PeripheryNear]: 3.5,
    [Region.PeripheryWeak]: 4.2,
  },

  densityLowGreen: 10,
  densityHighYellow: 20,
  densityHighRed: 30,

  developerShareRed: 0.5,
  developerShareKill: 0.4,

  deadlineImpossibleDays: 5,
  deadlineTightDays: 12,

  feeYellowPerUnit: 15000,
  feeRedPerUnit: 30000,
  feeYellowPct: 0.02,
  feeRedPct: 0.04,
  feeYellowFixed: 500000,
  feeRedFixed: 1500000,

  cityBlacklist: [],
  cityWhitelist: [
    "לוד",
    "רמלה",
    "חולון",
    "בת ים",
    "רמת גן",
    "פתח תקווה",
    "נתניה",
    "ראשון לציון",
    "הרצליה",
  ],
  maagarRequiredCities: ["לוד", "רמלה", "חולון"],
  registeredMaagarCities: ["לוד", "חולון"],

  cityRegion: {
    "תל אביב": Region.Prime,
    "רמת גן": Region.Prime,
    גבעתיים: Region.Prime,
    הרצליה: Region.Prime,
    "פתח תקווה": Region.GushDanSharon,
    "ראשון לציון": Region.GushDanSharon,
    חולון: Region.GushDanSharon,
    "בת ים": Region.GushDanSharon,
    "כפר סבא": Region.GushDanSharon,
    רעננה: Region.GushDanSharon,
    לוד: Region.PeripheryNear,
    רמלה: Region.PeripheryNear,
    נתניה: Region.PeripheryNear,
    אשדוד: Region.PeripheryNear,
    "הוד השרון": Region.GushDanSharon,
  },
  defaultRegion: Region.PeripheryNear,

  weights: {
    economics: 0.35,
    planning: 0.25,
    seriousness: 0.15,
    strategic: 0.15,
    timeline: 0.1,
  },

  advanceAt: 70,
  reviewAt: 45,

  autoSendQuestions: true,
  newLeadWindowDays: 7,
  showSeedData: true,
  yazamGateDensity: 8,
  // Drafted standing answers for the company-level שאלון יזם questions —
  // professional boilerplate BST can keep or edit in הגדרות. Specific legal /
  // financial identifiers (ח"פ number, exact bank, past-project list) are left
  // to BST to supply rather than invented here.
  yazamAnswers: {
    company_reg:
      'החברה רשומה כחברה פרטית ברשם החברות ופעילה בתחום ההתחדשות העירונית. מספר הח"פ ותעודת ההתאגדות (הכוללת את שנת הרישום) יימסרו לנציגות ולעורך הדין.',
    shareholders:
      "החברה בבעלות פרטית. הרכב בעלי המניות והדירקטורים המלא, בצירוף תדפיס רשם החברות, יימסר לעורך הדין של הנציגות.",
    contractor_registry:
      "כן. החברה והקבלן המבצע רשומים אצל רשם הקבלנים בסיווג המתאים להיקף פרויקטי בנייה למגורים.",
    completed_projects_count:
      "לחברה ניסיון מוכח בפרויקטי פינוי-בינוי והתחדשות עירונית. רשימת הפרויקטים שהושלמו ואלה שבביצוע מצורפת כנספח למצגת החברה.",
    developers_association: "כן. החברה חברה באיגוד היזמים והבונים בישראל.",
    audited_balance:
      "כן. מאזן מבוקר עדכני חתום בידי רואה חשבון יוצג לנציגות ולעורך הדין לפי דרישה ובכפוף לשמירת סודיות.",
    financing_banks:
      "הפרויקטים מלווים בליווי בנקאי סגור מבנק מלווה מוכר. פרטי הבנק המלווה לפרויקט יימסרו עם גיבוש העסקה.",
    guarantees:
      "החברה מספקת את מלוא הבטוחות לפי חוק המכר (דירות): ערבות חוק מכר, ערבות רישום, ערבות בדק וכן ערבויות נוספות בהתאם לשלבי הפרויקט.",
    insolvency_history:
      "לא. החברה מעולם לא נקלעה להליכי פירוק, כינוס נכסים או חדלות פירעון.",
    reference_projects:
      "בהחלט. תימסר רשימת פרויקטים שהושלמו בצירוף פרטי קשר של נציגויות דיירים, לצורך המלצה ובדיקת ממליצים.",
    actual_timelines:
      "לוחות הזמנים בפועל בפרויקטים האחרונים עמדו בהלימה למתוכנן. פירוט לוח הזמנים לכל פרויקט יוצג במצגת החברה.",
    site_visit: "כן, נשמח לתאם עבור הנציגות סיור באתר בנייה פעיל של החברה.",
    defects_handling:
      "לאחר המסירה מופעלות תקופת בדק ואחריות לפי חוק המכר, עם מוקד פניות ייעודי לטיפול בליקויים ומעקב עד לתיקון מלא.",
    delay_sanctions:
      "ההסכם כולל פיצוי מוסכם בגין איחור במסירה וכן כיסוי דמי שכירות לתקופת האיחור, בהתאם למקובל ולחוק.",
    no_majority:
      "ככל שלא יושג הרוב הנדרש בחוק, לא ייכפה הסכם על הדיירים והפעילות תיעצר. החברה תמשיך בליווי השלמת החתמת הרוב.",
    contract_amendments:
      "כן. ההסכם נחתם מול עורך הדין של הנציגות ופתוח למשא ומתן ולתיקונים מוסכמים לפני החתימה.",
    single_contact:
      "מנהל פרויקט ייעודי מטעם החברה משמש כאיש קשר יחיד לנציגות לאורך כל שלבי הפרויקט.",
    meeting_frequency:
      "פגישות נציגות-יזם מתקיימות באופן שוטף — לכל הפחות אחת לחודש, ובצמתים משמעותיים בתדירות גבוהה יותר.",
    progress_documentation:
      "התקדמות הפרויקט מתועדת בדוחות תקופתיים, פרוטוקולים ועדכונים שוטפים הנמסרים לנציגות ולבאי כוחה.",
    tenant_conflicts:
      "קונפליקטים בין דיירים מנוהלים בשקיפות מול הנציגות ובאמצעות עורך הדין והמפקח מטעם הדיירים, מתוך שוויוניות בין בעלי הדירות.",
  },
};

/** Resolve a city's region, with the configured fallback. */
export function regionForCity(
  city: string | null,
  config: TriageConfig,
): Region {
  if (!city) return config.defaultRegion;
  const trimmed = city.trim();
  return config.cityRegion[trimmed] ?? config.defaultRegion;
}
