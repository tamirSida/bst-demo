/**
 * Step 1 of the pipeline: email + attachments → structured Lead facts.
 * PDFs are passed as native document blocks (Claude reads scanned Hebrew docs).
 */

import type { ParsedEmail } from "../eml/parse";
import { structuredCall, toJsonSchema, type UserBlock } from "./client";
import { ExtractionSchema, type ExtractionResult } from "./schemas";

const MAX_DOCS = 6;
const MAX_DOC_BYTES = 9 * 1024 * 1024; // keep each PDF well under the request cap

const EXTRACTION_SYSTEM = `אתה מנתח לידים לפיתוח עסקי בחברת BST (התחדשות עירונית בישראל).
קיבלת מייל ונספחים (הזמנה להציע הצעות, שאלון ליזמים, טיוטות הסכם, נסחים ועוד) בעברית.
משימתך: לחלץ את העובדות לשדות מובנים עבור מנוע הסינון (טריאז').

כללים מחייבים:
- אל תמציא ערכים. אם ערך לא מופיע במפורש — החזר null. עדיף null מאשר ניחוש.
- מספרים: החזר מספר נקי (יח"ד, דונם, אחוזים כמספר בין 0 ל-100, סכומים ב-₪).
- דונם: אם מצוין שטח במ"ר, המר לדונם (1 דונם = 1000 מ"ר).
- תאריך מועד אחרון להגשה: החזר בפורמט ISO (YYYY-MM-DD) לפי מיטב יכולתך.
- planStatus: בחר את הקטגוריה המתאימה. "תב\"ע בניינית מאושרת" / "תב\"ע מאושרת" → approved_mitcham. "אין תכנית, נדרשת תב\"ע חדשה" עם מדיניות → policy_no_plan. אם לא ברור → unknown.
- sourceType: מי שלח את הליד — עו"ד דיירים (tenant_lawyer), מארגן (organizer), מתווך (broker), מנהלת עירונית (municipality).
- sourceFee: אם מוזכרת עמלה/שכר טרחה שהגורם המפנה גובה עבור הליד — חלץ סכום, מבנה (per_unit / percentage / fixed) והערה. אחוזים כשבר עשרוני (2% → 0.02). אם לא מוזכר → null.
- documents: סווג כל נספח לפי סוגו.
- provenance: עבור כל שדה עיקרי שחילצת, ציין מאיפה (label קצר בעברית כמו "שאלון, עמ' 1" או "גוף המייל"), ציטוט קצר (quote) וביטחון (confidence 0-1).
- החזר JSON תקין בלבד לפי הסכימה.`;

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

  return structuredCall({
    system: EXTRACTION_SYSTEM,
    blocks,
    schema: ExtractionSchema,
    jsonSchema: toJsonSchema(ExtractionSchema),
    maxTokens: 4096,
  });
}
