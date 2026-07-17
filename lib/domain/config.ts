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
