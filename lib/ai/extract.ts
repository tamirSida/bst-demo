/**
 * Step 1 of the pipeline: email + attachments → structured Lead facts.
 * PDFs are passed as native document blocks (Claude reads scanned Hebrew docs).
 */

import type { ParsedEmail } from "../eml/parse";
import { classifyDoc } from "../eml/classify";
import { structuredCall, type UserBlock } from "./client";
import { RawExtractionSchema, normalizeExtraction, type ExtractionResult } from "./schemas";

const MAX_DOCS = 6;
const MAX_DOC_BYTES = 9 * 1024 * 1024; // keep each PDF well under the request cap

const EXTRACTION_SYSTEM = `אתה מנתח לידים לפיתוח עסקי בחברת BST (התחדשות עירונית בישראל).
קיבלת מייל ונספחים (הזמנה להציע הצעות, שאלון ליזמים, טיוטות הסכם, נסחים ועוד) בעברית.
משימתך: לחלץ את כל העובדות לשדות מובנים עבור מנוע הסינון (טריאז').

חשוב מאוד — קרא את כל המקורות:
- קרא את גוף המייל כולל הודעות מצוטטות ומועברות (שרשור המייל המלא), ואת כל קבצי ה-PDF המצורפים.
- מספרי יח"ד, שטח מגרש וגוש/חלקה מופיעים לרוב בכותרת ההזמנה/השאלון או בהודעות המועברות. חובה לחלץ אותם אם הם מופיעים בכל מקום בטקסט או בנספחים.

דוגמאות לחילוץ:
- "36 יח"ד מצב קיים" או "36 יח"ד קיימות" → unitsExisting = 36.
- "שטח מגרש: 5.6 דונם" או "5.6 דונם" → lotAreaDunam = 5.6. אם רשום במ"ר, חלק ב-1000.
- "חלקות 5, 6 בגוש 5290" → gushHelka = ["גוש 5290 חלקה 5", "גוש 5290 חלקה 6"].
- "תוכנית 406-1063890" או "תב"ע 406-1063890" → planNumber = "406-1063890".
- "צפיפות 6.4 יח"ד לדונם" — מידע תומך, לא שדה נפרד.

כללים:
- אל תמציא ערכים. אם ערך לא מופיע בשום מקום — השמט את השדה.
- מספרים: החזר מספר נקי בלבד. אחוזים כמספר בין 0 ל-100. סכומים ב-₪.
- submissionDeadline: פורמט ISO (YYYY-MM-DD).
- dealType (חובה): אחד מ- pinui_binui, tama_38_2, initiative, rami_tender, external_offer.
- planStatus: approved_mitcham (תב"ע מאושרת/בניינית מאושרת), deposited, early_process, policy_no_plan (אין תכנית אך יש מדיניות), no_policy, conflicts_policy, unknown.
- sourceType: tenant_lawyer (עו"ד דיירים), organizer (מארגן), broker (מתווך), municipality (מנהלת עירונית), rami_publication, other.
- feeStructure: per_unit (לכל יח"ד), percentage (אחוז — כשבר עשרוני, 2%→0.02), fixed (קבוע). מלא feeAmount/feeStructure/feeNote רק אם מוזכרת עמלה שהגורם המפנה גובה.
- אנשי קשר — הפרד בין הגורמים:
  - contactName: שם האדם הפונה (איש הקשר).
  - contactCompany: חברת היזם/הישות שמאחורי העסקה, אם מוזכרת ושונה מהמשרד המפנה.
  - contactFirm: המשרד/הגורם המפנה — עו"ד דיירים, מארגן או מתווך.
  - contactEmail: כתובת המייל של איש הקשר — השדה החשוב ביותר; חלץ אותו תמיד אם מופיע, כולל מתוך חתימת המייל.
  - contactPhone: מספר טלפון.
- sourceNote: משפט קצר בעברית המתאר מהיכן הגיעו עיקר הנתונים.`;

export async function extractLead(email: ParsedEmail): Promise<ExtractionResult> {
  const blocks: UserBlock[] = [];

  const header = [
    `נושא: ${email.subject}`,
    email.fromName || email.fromEmail
      ? `מאת: ${[email.fromName, email.fromEmail].filter(Boolean).join(" ")}`
      : null,
    email.date ? `תאריך: ${email.date}` : null,
    email.otherAttachments.length
      ? `נספחים נוספים (לא נקראים): ${email.otherAttachments.map((a) => a.filename).join(", ")}`
      : null,
    "",
    "גוף המייל:",
    email.text || "(ריק)",
  ]
    .filter((l) => l !== null)
    .join("\n");

  blocks.push({ type: "text", text: header });

  let added = 0;
  for (const doc of email.documents) {
    if (added >= MAX_DOCS) break;
    if (doc.sizeBytes > MAX_DOC_BYTES) continue;
    if (!/pdf/i.test(doc.contentType) && !/\.pdf$/i.test(doc.filename)) continue;
    blocks.push({
      type: "document",
      title: doc.filename,
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: doc.content.toString("base64"),
      },
    });
    added++;
  }

  // Free-JSON mode (no jsonSchema): Sonnet 4.6's structured-output compiler
  // rejects our field set as "too complex", so we prompt for JSON and coerce.
  const raw = await structuredCall({
    system: EXTRACTION_SYSTEM,
    blocks,
    schema: RawExtractionSchema,
    maxTokens: 4096,
  });

  // Documents are classified from filenames, not by the model. Only real
  // documents count — inline images (signatures, logos) are noise and must not
  // flood the timeline/documents panel.
  const isNoise = (name: string, mime: string) =>
    /image\//i.test(mime) || /\.(png|jpe?g|gif|bmp|webp)$/i.test(name);
  const documents = [
    ...email.documents,
    ...email.otherAttachments.filter((a) => !isNoise(a.filename, a.contentType)),
  ].map((a) => ({ fileName: a.filename, type: classifyDoc(a.filename) }));

  return normalizeExtraction(raw, documents);
}
