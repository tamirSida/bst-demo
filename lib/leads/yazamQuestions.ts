/**
 * The standard "שאלון יזם" (developer questionnaire) for פינוי-בינוי tenders —
 * the 25 questions BST must answer when bidding on a compound. Source:
 * hithadshut.co.il/madrichim/sheelot-shalemot-leyazam-pinui-binui.
 *
 * Most are company-level facts that repeat verbatim across every tender
 * (`scope: "company"`) and can be auto-filled from BST's company profile.
 * A few are deal-specific (`scope: "deal"`) and must be reviewed/approved by a
 * human before they go out — those are flagged in the UI.
 */
export type YazamScope = "company" | "deal";

export interface YazamQuestion {
  /** Stable key for storing the answer. */
  key: string;
  /** 1-based number as it appears in the source questionnaire. */
  num: number;
  category: string;
  text: string;
  scope: YazamScope;
}

export const YAZAM_CATEGORIES = [
  "רקע חברה",
  "איתנות פיננסית",
  "ניסיון בביצוע",
  "תנאי חוזה",
  "תקשורת ותהליך",
] as const;

export const YAZAM_QUESTIONS: YazamQuestion[] = [
  // 1 — רקע חברה
  { key: "company_reg", num: 1, category: "רקע חברה", text: "מה מספר הח״פ של החברה ומתי נרשמה?", scope: "company" },
  { key: "shareholders", num: 2, category: "רקע חברה", text: "מי בעלי המניות והדירקטורים?", scope: "company" },
  { key: "contractor_registry", num: 3, category: "רקע חברה", text: "האם החברה רשומה אצל רשם הקבלנים?", scope: "company" },
  { key: "completed_projects_count", num: 4, category: "רקע חברה", text: "כמה פרויקטי פינוי בינוי החברה השלימה?", scope: "company" },
  { key: "developers_association", num: 5, category: "רקע חברה", text: "האם החברה חברה באיגוד היזמים בישראל?", scope: "company" },

  // 2 — איתנות פיננסית
  { key: "audited_balance", num: 6, category: "איתנות פיננסית", text: "האם תוכלו להציג מאזן מבוקר אחרון?", scope: "company" },
  { key: "financing_banks", num: 7, category: "איתנות פיננסית", text: "איזה בנקים מממנים את החברה?", scope: "company" },
  { key: "project_equity", num: 8, category: "איתנות פיננסית", text: "מה ההון העצמי שמוקצה לפרויקט?", scope: "deal" },
  { key: "guarantees", num: 9, category: "איתנות פיננסית", text: "איזה ערבויות אתם מספקים בכל שלב?", scope: "company" },
  { key: "insolvency_history", num: 10, category: "איתנות פיננסית", text: "האם החברה התמודדה אי פעם עם פירוק או חדלות פירעון?", scope: "company" },

  // 3 — ניסיון בביצוע
  { key: "reference_projects", num: 11, category: "ניסיון בביצוע", text: "תוכלו להציג רשימת 5 פרויקטים שהסתיימו עם פרטי קשר של נציגויות?", scope: "company" },
  { key: "actual_timelines", num: 12, category: "ניסיון בביצוע", text: "מה היה לוח הזמנים בפועל בפרויקטים האחרונים?", scope: "company" },
  { key: "site_visit", num: 13, category: "ניסיון בביצוע", text: "האם ניתן לבקר באתר בנייה פעיל?", scope: "company" },
  { key: "executing_contractor", num: 14, category: "ניסיון בביצוע", text: "מי הקבלן שמבצע את הבנייה בפועל?", scope: "deal" },
  { key: "defects_handling", num: 15, category: "ניסיון בביצוע", text: "איך מטופלים ליקויים אחרי מסירה?", scope: "company" },

  // 4 — תנאי חוזה
  { key: "owner_consideration", num: 16, category: "תנאי חוזה", text: "מה התמורה המוצעת לכל בעל דירה?", scope: "deal" },
  { key: "elderly_terms", num: 17, category: "תנאי חוזה", text: "מה התנאים לקשישים?", scope: "deal" },
  { key: "delay_sanctions", num: 18, category: "תנאי חוזה", text: "איזה סנקציות קיימות במקרה של איחור היזם?", scope: "company" },
  { key: "no_majority", num: 19, category: "תנאי חוזה", text: "מה קורה אם אין הרוב הנדרש?", scope: "company" },
  { key: "contract_amendments", num: 20, category: "תנאי חוזה", text: "האם תסכימו לתיקונים בחוזה?", scope: "company" },

  // 5 — תקשורת ותהליך
  { key: "single_contact", num: 21, category: "תקשורת ותהליך", text: "מי איש הקשר היחיד מהחברה לאורך הפרויקט?", scope: "company" },
  { key: "meeting_frequency", num: 22, category: "תקשורת ותהליך", text: "באיזה תדירות מתקיימות פגישות נציגות-יזם?", scope: "company" },
  { key: "progress_documentation", num: 23, category: "תקשורת ותהליך", text: "איך מתועד התקדמות הפרויקט?", scope: "company" },
  { key: "tenant_conflicts", num: 24, category: "תקשורת ותהליך", text: "איך מטפלים בקונפליקטים בין דיירים?", scope: "company" },
  { key: "owner_exit", num: 25, category: "תקשורת ותהליך", text: "מה אם בעל דירה רוצה לצאת מהפרויקט באמצע?", scope: "deal" },
];
