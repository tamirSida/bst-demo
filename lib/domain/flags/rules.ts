/**
 * The triage rule set. Each rule is a small pure function of (lead, config).
 * Rules never mutate; they return Flag objects the engine collects. Thresholds
 * always come from config so nothing is hard-coded.
 *
 * Note: duplicate-lead detection needs the archive and is therefore NOT a pure
 * rule — it runs in the ingestion pipeline against the repository, then injects
 * its flag. Everything here is deterministic on a single lead.
 */

import { DealType, FlagSeverity, FeeStructure, PlanStatus } from "../enums";
import { regionForCity, REGION_LABEL } from "../config";
import { businessDaysUntil, density, developerShare, multiplier, round } from "../compute";
import type { Flag } from "../types";
import type { RegisteredRule, RuleContext } from "./types";

/* Helper to keep flag construction terse and consistent. */
function flag(f: Flag): Flag {
  return f;
}

const ALL_DEAL_TYPES: DealType[] = [
  DealType.PinuiBinui,
  DealType.Tama38,
  DealType.Initiative,
  DealType.RamiTender,
  DealType.ExternalOffer,
];

/* ================================================================== */
/* Universal rules                                                     */
/* ================================================================== */

const deadlineRule: RegisteredRule = {
  id: "deadline",
  appliesTo: ALL_DEAL_TYPES,
  run: ({ lead, config }: RuleContext) => {
    const days = businessDaysUntil(lead.submissionDeadline);
    if (days == null) return null;
    if (days < config.deadlineImpossibleDays) {
      return flag({
        id: "deadline_impossible",
        severity: FlagSeverity.Red,
        title: days < 0 ? "המועד חלף" : `הגשה בעוד ${days} ימי עבודה`,
        detail:
          days < 0
            ? "מועד ההגשה כבר עבר. נדרשת בקשת דחייה כדי להמשיך."
            : `נותרו ${days} ימי עבודה בלבד עד ההגשה — פחות מהמינימום (${config.deadlineImpossibleDays}) הדרוש לבדיקה ומענה.`,
        rule: `מועד הגשה מתחת ל-${config.deadlineImpossibleDays} ימי עבודה`,
        field: "submissionDeadline",
        cure: "לשלוח בקשת דחייה לגורם הפונה",
      });
    }
    if (days < config.deadlineTightDays) {
      return flag({
        id: "deadline_tight",
        severity: FlagSeverity.Yellow,
        title: `הגשה בעוד ${days} ימי עבודה`,
        detail: `לוח הזמנים לחוץ (${days} ימי עבודה). יש לתעדף בדיקה מהירה.`,
        rule: `מועד הגשה מתחת ל-${config.deadlineTightDays} ימי עבודה`,
        field: "submissionDeadline",
      });
    }
    return null;
  },
};

const cityBlacklistRule: RegisteredRule = {
  id: "city_blacklist",
  appliesTo: ALL_DEAL_TYPES,
  run: ({ lead, config }: RuleContext) => {
    if (!lead.city) return null;
    if (config.cityBlacklist.includes(lead.city.trim())) {
      return flag({
        id: "city_blacklist",
        severity: FlagSeverity.Kill,
        title: `עיר לא רלוונטית: ${lead.city}`,
        detail: `${lead.city} נמצאת ברשימת הערים שאינן בפוקוס האסטרטגי.`,
        rule: "עיר ברשימה השחורה",
        field: "city",
      });
    }
    return null;
  },
};

const cityUnknownRule: RegisteredRule = {
  id: "city_unknown",
  appliesTo: ALL_DEAL_TYPES,
  run: ({ lead, config }: RuleContext) => {
    if (!lead.city) return null;
    const c = lead.city.trim();
    if (config.cityBlacklist.includes(c)) return null;
    if (config.cityWhitelist.includes(c)) {
      return flag({
        id: "city_target",
        severity: FlagSeverity.Green,
        title: `עיר יעד: ${c}`,
        detail: `${c} נמצאת ברשימת ערי היעד של החברה.`,
        rule: "עיר ברשימת היעד",
        field: "city",
      });
    }
    return flag({
      id: "city_unknown",
      severity: FlagSeverity.Yellow,
      title: `עיר חדשה: ${c}`,
      detail: `${c} אינה ברשימת ערי היעד — נדרשת החלטת כניסה לשוק חדש.`,
      rule: "עיר שאינה ברשימת היעד",
      field: "city",
    });
  },
};

const sourceFeeRule: RegisteredRule = {
  id: "source_fee",
  appliesTo: [DealType.PinuiBinui, DealType.Tama38, DealType.Initiative],
  run: ({ lead, config }: RuleContext) => {
    const fee = lead.sourceFee;
    if (!fee || fee.amount == null) return null;

    let yellow: number;
    let red: number;
    let unit: string;
    switch (fee.structure) {
      case FeeStructure.PerUnit:
        yellow = config.feeYellowPerUnit;
        red = config.feeRedPerUnit;
        unit = 'לכל יח"ד';
        break;
      case FeeStructure.Percentage:
        yellow = config.feeYellowPct;
        red = config.feeRedPct;
        unit = "מהעסקה";
        break;
      case FeeStructure.Fixed:
        yellow = config.feeYellowFixed;
        red = config.feeRedFixed;
        unit = "סכום קבוע";
        break;
      default:
        return null;
    }

    const shown =
      fee.structure === FeeStructure.Percentage
        ? `${round(fee.amount * 100, 1)}% ${unit}`
        : `${fee.amount.toLocaleString("he-IL")} ₪ ${unit}`;

    if (fee.amount >= red) {
      return flag({
        id: "source_fee_high",
        severity: FlagSeverity.Red,
        title: `עמלת מקור גבוהה: ${shown}`,
        detail: `העמלה הנדרשת (${shown}) חורגת מהסף האדום. פוגעת מהותית ברווחיות ומחייבת אישור הנהלה.`,
        rule: "עמלת מקור מעל הסף האדום",
        field: "sourceFee",
        cure: "מו״מ על העמלה מול הגורם המפנה",
      });
    }
    if (fee.amount >= yellow) {
      return flag({
        id: "source_fee_elevated",
        severity: FlagSeverity.Yellow,
        title: `עמלת מקור: ${shown}`,
        detail: `העמלה הנדרשת (${shown}) גבוהה ומשפיעה על הרווחיות — יש לשקלל בבדיקה הכלכלית.`,
        rule: "עמלת מקור מעל הסף הצהוב",
        field: "sourceFee",
      });
    }
    return null;
  },
};

/* ================================================================== */
/* פינוי-בינוי + תמ"א 38/2 shared economics & planning rules            */
/* ================================================================== */

const belowLegalMinimumRule: RegisteredRule = {
  id: "below_legal_minimum",
  appliesTo: [DealType.PinuiBinui],
  run: ({ lead, config }: RuleContext) => {
    if (lead.unitsExisting == null) return null;
    if (lead.unitsExisting < config.pinuiBinuiMinUnits) {
      return flag({
        id: "below_legal_minimum",
        severity: FlagSeverity.Kill,
        title: `מתחת למינימום (${lead.unitsExisting} יח"ד)`,
        detail: `${lead.unitsExisting} יח"ד קיימות — מתחת ל-${config.pinuiBinuiMinUnits} יח"ד, הרף הסטטוטורי למתחם פינוי-בינוי.`,
        rule: `מינימום ${config.pinuiBinuiMinUnits} יח"ד לפינוי-בינוי`,
        field: "unitsExisting",
        cure: "לבדוק צירוף חלקות סמוכות להשלמת מתחם",
      });
    }
    return null;
  },
};

const smallMitchamRule: RegisteredRule = {
  id: "small_mitcham",
  appliesTo: [DealType.PinuiBinui],
  run: ({ lead, config }: RuleContext) => {
    if (lead.unitsExisting == null) return null;
    if (
      lead.unitsExisting >= config.pinuiBinuiMinUnits &&
      lead.unitsExisting < config.smallMitchamMaxUnits
    ) {
      return flag({
        id: "small_mitcham",
        severity: FlagSeverity.Yellow,
        title: `מתחם קטן (${lead.unitsExisting} יח"ד)`,
        detail: `${lead.unitsExisting} יח"ד — מתחם קטן; לרוב נדרש צפיפות נמוכה כדי לכסות עלויות קבועות.`,
        rule: `${config.pinuiBinuiMinUnits}–${config.smallMitchamMaxUnits} יח"ד`,
        field: "unitsExisting",
      });
    }
    return null;
  },
};

const densityRule: RegisteredRule = {
  id: "density",
  appliesTo: [DealType.PinuiBinui, DealType.Tama38],
  run: ({ lead, config }: RuleContext) => {
    const d = density(lead);
    if (d == null) return null;
    const shown = round(d, 1);
    if (d > config.densityHighRed) {
      return flag({
        id: "density_very_high",
        severity: FlagSeverity.Red,
        title: `צפיפות גבוהה מאוד (${shown})`,
        detail: `צפיפות קיימת ${shown} יח"ד/דונם — מעל ${config.densityHighRed}. אין מרווח תכנוני להגיע למכפיל הנדרש.`,
        rule: `צפיפות קיימת מעל ${config.densityHighRed} יח"ד/דונם`,
        field: "unitsExisting",
      });
    }
    if (d > config.densityHighYellow) {
      return flag({
        id: "density_high",
        severity: FlagSeverity.Yellow,
        title: `צפיפות גבוהה (${shown})`,
        detail: `צפיפות קיימת ${shown} יח"ד/דונם — מעל ${config.densityHighYellow}. מקשה על השגת מכפיל.`,
        rule: `צפיפות קיימת מעל ${config.densityHighYellow} יח"ד/דונם`,
        field: "unitsExisting",
      });
    }
    if (d < config.densityLowGreen) {
      return flag({
        id: "density_low",
        severity: FlagSeverity.Green,
        title: `צפיפות ${shown} — פוטנציאל טוב`,
        detail: `צפיפות קיימת נמוכה (${shown} יח"ד/דונם) — מרווח תכנוני נדיב למכפיל גבוה.`,
        rule: `צפיפות קיימת מתחת ל-${config.densityLowGreen} יח"ד/דונם`,
        field: "unitsExisting",
      });
    }
    return null;
  },
};

const multiplierRule: RegisteredRule = {
  id: "multiplier",
  appliesTo: [DealType.PinuiBinui, DealType.Tama38],
  run: ({ lead, config }: RuleContext) => {
    const m = multiplier(lead);
    if (m == null) return null;
    const region = regionForCity(lead.city, config);
    const floor = config.multiplierFloor[region];
    if (m >= floor) return null;

    const rightsAreCapped = lead.planStatus === PlanStatus.ApprovedMitcham;
    return flag({
      id: "multiplier_below_floor",
      severity: rightsAreCapped ? FlagSeverity.Red : FlagSeverity.Yellow,
      title: `מכפיל נמוך (${round(m, 2)})`,
      detail: `מכפיל ${round(m, 2)} (${lead.unitsPlanned}/${lead.unitsExisting}) מתחת לרף האזורי ${floor} עבור «${REGION_LABEL[region]}».${rightsAreCapped ? " הזכויות מקובעות בתב\"ע מאושרת." : " ניתן לתכנן צפיפות גבוהה יותר."}`,
      rule: `מכפיל מתחת ל-${floor} (${REGION_LABEL[region]})`,
      field: "unitsPlanned",
    });
  },
};

const developerShareRule: RegisteredRule = {
  id: "developer_share",
  appliesTo: [DealType.PinuiBinui, DealType.Tama38],
  run: ({ lead, config }: RuleContext) => {
    const s = developerShare(lead);
    if (s == null) return null;
    const pct = round(s * 100, 0);
    if (s < config.developerShareKill) {
      return flag({
        id: "developer_share_kill",
        severity: FlagSeverity.Kill,
        title: `חלק יזם נמוך (${pct}%)`,
        detail: `רק ${pct}% מהיח"ד החדשות מיועדות למכירה — מתחת ל-${round(config.developerShareKill * 100, 0)}%. ההכנסות לא יכסו את עלויות הפרויקט.`,
        rule: `חלק יזם מתחת ל-${round(config.developerShareKill * 100, 0)}%`,
        field: "developerUnits",
      });
    }
    if (s < config.developerShareRed) {
      return flag({
        id: "developer_share_low",
        severity: FlagSeverity.Red,
        title: `חלק יזם נמוך (${pct}%)`,
        detail: `${pct}% מהיח"ד החדשות למכירה — מתחת ל-${round(config.developerShareRed * 100, 0)}%. רווחיות בסיכון.`,
        rule: `חלק יזם מתחת ל-${round(config.developerShareRed * 100, 0)}%`,
        field: "developerUnits",
        cure: "בחינת הגדלת זכויות או שיפור יחס התמורות",
      });
    }
    return null;
  },
};

const planStatusRule: RegisteredRule = {
  id: "plan_status",
  appliesTo: [DealType.PinuiBinui, DealType.Tama38],
  run: ({ lead }: RuleContext) => {
    switch (lead.planStatus) {
      case PlanStatus.ConflictsPolicy:
        return flag({
          id: "plan_conflicts",
          severity: FlagSeverity.Kill,
          title: "בסתירה למדיניות",
          detail: "הפרויקט סותר את המדיניות העירונית — אין מסלול תכנוני ריאלי.",
          rule: "סתירה למדיניות העירונית",
          field: "planStatus",
        });
      case PlanStatus.NoPolicy:
        return flag({
          id: "plan_no_policy",
          severity: FlagSeverity.Red,
          title: "אין תכנית ואין מדיניות",
          detail: "אין תב\"ע ואין מדיניות עירונית תומכת — סיכון תכנוני גבוה ולוח זמנים ארוך.",
          rule: "אין תכנית ואין מדיניות",
          field: "planStatus",
          cure: "בירור מדיניות מול המנהלת / הוועדה המקומית",
        });
      case PlanStatus.PolicyNoPlan:
        return flag({
          id: "plan_policy_only",
          severity: FlagSeverity.Yellow,
          title: "אין תכנית, קיימת מדיניות",
          detail: "נדרשת תב\"ע חדשה (4–7 שנות תכנון), אך קיימת מדיניות תומכת.",
          rule: "אין תכנית אך קיימת מדיניות",
          field: "planStatus",
        });
      case PlanStatus.Deposited:
      case PlanStatus.EarlyProcess:
        return flag({
          id: "plan_in_process",
          severity: FlagSeverity.Yellow,
          title: "תב\"ע בהליכים",
          detail: "התב\"ע בהליכי אישור — יש לוודא לוחות זמנים והתאמה לתכנון.",
          rule: "תב\"ע בהפקדה / בהליכים",
          field: "planStatus",
        });
      case PlanStatus.ApprovedMitcham:
        return flag({
          id: "plan_approved",
          severity: FlagSeverity.Green,
          title: "תב\"ע מאושרת",
          detail: "קיימת תב\"ע מאושרת למתחם — ודאות תכנונית גבוהה וקיצור לוחות זמנים.",
          rule: "תב\"ע מאושרת למתחם",
          field: "planStatus",
        });
      default:
        return null;
    }
  },
};

const maagarRule: RegisteredRule = {
  id: "maagar",
  appliesTo: [DealType.PinuiBinui],
  run: ({ lead, config }: RuleContext) => {
    if (!lead.city) return null;
    const c = lead.city.trim();
    if (!config.maagarRequiredCities.includes(c)) return null;
    const registered =
      config.registeredMaagarCities.includes(c) || lead.registeredInMaagar === true;
    if (registered) return null;
    return flag({
      id: "maagar_not_registered",
      severity: FlagSeverity.Red,
      title: "לא רשומים במאגר היזמים",
      detail: `העיר ${c} דורשת רישום במאגר יזמים כתנאי סף להגשה, והחברה אינה רשומה.`,
      rule: "נדרש רישום במאגר יזמים",
      field: "registeredInMaagar",
      cure: "בדיקת חלון רישום פתוח והרשמה למאגר",
    });
  },
};

/* ================================================================== */
/* תמ"א 38/2 specific                                                   */
/* ================================================================== */

const tamaUnitsRangeRule: RegisteredRule = {
  id: "tama_units_range",
  appliesTo: [DealType.Tama38],
  run: ({ lead, config }: RuleContext) => {
    if (lead.unitsExisting == null) return null;
    if (lead.unitsExisting < config.tamaMinUnits) {
      return flag({
        id: "tama_too_small",
        severity: FlagSeverity.Yellow,
        title: `קטן מדי לתמ"א (${lead.unitsExisting} יח"ד)`,
        detail: `${lead.unitsExisting} יח"ד — מתחת ל-${config.tamaMinUnits}; קשה לכסות עלויות.`,
        rule: `מינימום ${config.tamaMinUnits} יח"ד לתמ"א 38/2`,
        field: "unitsExisting",
      });
    }
    if (lead.unitsExisting > config.tamaMaxUnits) {
      return flag({
        id: "tama_reclassify",
        severity: FlagSeverity.Yellow,
        title: "לשקול פינוי-בינוי",
        detail: `${lead.unitsExisting} יח"ד — מעל ${config.tamaMaxUnits}; ייתכן שמתאים יותר כמתחם פינוי-בינוי.`,
        rule: `מעל ${config.tamaMaxUnits} יח"ד — לשקול סיווג מחדש`,
        field: "unitsExisting",
      });
    }
    return null;
  },
};

/* ================================================================== */
/* Registry                                                            */
/* ================================================================== */

export const RULES: RegisteredRule[] = [
  // universal
  deadlineRule,
  cityBlacklistRule,
  cityUnknownRule,
  sourceFeeRule,
  // pinui-binui + tama shared
  belowLegalMinimumRule,
  smallMitchamRule,
  densityRule,
  multiplierRule,
  developerShareRule,
  planStatusRule,
  maagarRule,
  // tama specific
  tamaUnitsRangeRule,
];
