/**
 * Step 2: gap analysis. Given the extracted lead, decide what's still missing
 * for triage + the שמאי package, and generate the form questions for THIS lead.
 *
 * A deterministic guarantee is layered on top of the AI: the source-fee question
 * is always present when the fee is unknown, because it must feed the final grade.
 */

import { FeeStructure } from "../domain/enums";
import type { FormQuestion, Lead } from "../domain/types";
import { structuredCall, toJsonSchema } from "./client";
import { GapAnalysisSchema, type GapAnalysisResult } from "./schemas";

const GAP_SYSTEM = `אתה עוזר לצוות הפיתוח העסקי של BST לנסח שאלות השלמה לגורם ששלח ליד להתחדשות עירונית.
קיבלת את העובדות שכבר ידועות על הליד. משימתך: לזהות מה חסר כדי (א) לסיים סינון ראשוני, (ב) להעביר לבדיקת שמאי.

מה נדרש לסינון והחלטה:
- יח"ד קיימות ויוצאות, שטח מגרש (דונם), סטטוס תכנוני ומספר תב"ע.
- אחוז חתימות/ייצוג הבעלים במתחם.
- העמלה שהגורם המפנה גובה עבור הליד (סכום ומבנה) — קריטי לתמחור.
- נסחי טאבו, תשריט בית משותף (לשלב השמאי).
- אחוז דיור ציבורי (עמידר/חלמיש) אם רלוונטי.

כללים:
- שאל רק על מה שחסר או לא ודאי. אל תשאל על מה שכבר ידוע.
- נסח שאלות קצרות, ברורות ובעברית, מותאמות לליד הספציפי הזה.
- לכל שאלה קבע kind מתאים (number/percent/currency/date/boolean/select/text/file) ו-unit במידת הצורך.
- אם חסר מסמך (נסח/תשריט) — צור שאלה מסוג file.
- אם ידוע ערך חלקי ורוצים אישור — הכנס אותו כ-prefill.
- fact: אם השאלה ממלאת שדה עובדתי ידוע, ציין את שם השדה (unitsExisting, unitsPlanned, lotAreaDunam, planStatus, signaturePct, publicHousingPct, sourceFee), אחרת null.
- החזר JSON תקין בלבד.`;

export async function analyzeGaps(lead: Lead): Promise<FormQuestion[]> {
  const facts = summarizeFactsForGaps(lead);
  const result: GapAnalysisResult = await structuredCall({
    system: GAP_SYSTEM,
    blocks: [{ type: "text", text: facts }],
    schema: GapAnalysisSchema,
    jsonSchema: toJsonSchema(GapAnalysisSchema),
    maxTokens: 3072,
    think: true,
  });

  const questions: FormQuestion[] = result.questions.map((q) => ({
    key: q.key,
    fact: (q.fact as FormQuestion["fact"]) ?? undefined,
    label: q.label,
    kind: q.kind,
    required: q.required,
    options: q.options ?? undefined,
    unit: q.unit ?? undefined,
    help: q.help ?? undefined,
    prefill: q.prefillText ?? undefined,
  }));

  return ensureFeeQuestion(lead, questions);
}

/** The source fee always gets asked when unknown — it drives the final grade. */
function ensureFeeQuestion(lead: Lead, questions: FormQuestion[]): FormQuestion[] {
  const feeKnown = lead.sourceFee?.amount != null;
  const alreadyAsked = questions.some((q) => q.fact === "sourceFee" || q.key === "source_fee");
  if (feeKnown || alreadyAsked) return questions;
  return [
    ...questions,
    {
      key: "source_fee",
      fact: "sourceFee",
      label: "מהי העמלה שאתם גובים עבור הליד?",
      kind: "currency",
      required: true,
      unit: "₪",
      help: 'ניתן לציין סכום קבוע, סכום לכל יח"ד או אחוז מהעסקה בהערה.',
    },
  ];
}

function summarizeFactsForGaps(lead: Lead): string {
  const known: string[] = [`סוג עסקה: ${lead.dealType}`];
  const push = (label: string, v: unknown) => {
    if (v !== null && v !== undefined && v !== "") known.push(`${label}: ${v}`);
  };
  push("עיר", lead.city);
  push("פרויקט", lead.projectName);
  push("כתובת", lead.address);
  push('גוש/חלקה', lead.gushHelka.join(" ; "));
  push('יח"ד קיימות', lead.unitsExisting);
  push('יח"ד יוצאות', lead.unitsPlanned);
  push('שטח (דונם)', lead.lotAreaDunam);
  push("סטטוס תכנוני", lead.planStatus);
  push('מס\' תב"ע', lead.planNumber);
  push("אחוז חתימות", lead.signaturePct);
  push("אחוז דיור ציבורי", lead.publicHousingPct);
  push(
    "עמלת מקור",
    lead.sourceFee?.amount != null ? `${lead.sourceFee.amount} (${lead.sourceFee.structure})` : null,
  );
  push("מקור הליד", lead.sourceType);
  const docs = (lead.extra.documentTypes as string[] | undefined) ?? [];
  if (docs.length) known.push(`מסמכים שהתקבלו: ${docs.join(", ")}`);
  return `העובדות הידועות על הליד:\n${known.join("\n")}\n\nמה חסר?`;
}

export { FeeStructure };
