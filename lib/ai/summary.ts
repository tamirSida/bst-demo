/**
 * Step 3: a 3–5 line Hebrew management summary of the lead, facts-forward.
 */

import { DEAL_TYPE_LABEL, VERDICT_LABEL } from "../domain/enums";
import type { Lead } from "../domain/types";
import { structuredCall, toJsonSchema } from "./client";
import { SummarySchema } from "./schemas";

const SUMMARY_SYSTEM = `אתה כותב תקציר ניהולי קצר (3–5 שורות) על ליד להתחדשות עירונית עבור הנהלת BST.
הצג עובדות תחילה: סוג עסקה, מיקום, יח"ד, צפיפות/מכפיל אם ידועים, סטטוס תכנוני, מקור הליד ומועד הגשה.
כתוב בעברית עניינית, בלי סופרלטיבים ובלי אימוג'י. החזר JSON עם השדה summary בלבד.`;

export async function summarizeLead(lead: Lead): Promise<string> {
  const facts = [
    `סוג: ${DEAL_TYPE_LABEL[lead.dealType]}`,
    lead.city ? `עיר: ${lead.city}` : null,
    lead.projectName ? `פרויקט: ${lead.projectName}` : null,
    lead.unitsExisting != null ? `יח"ד קיימות: ${lead.unitsExisting}` : null,
    lead.unitsPlanned != null ? `יח"ד יוצאות: ${lead.unitsPlanned}` : null,
    lead.lotAreaDunam != null ? `שטח: ${lead.lotAreaDunam} דונם` : null,
    lead.planNumber ? `תב"ע: ${lead.planNumber}` : null,
    lead.contact?.name ? `איש קשר: ${lead.contact.name}` : null,
    lead.submissionDeadline ? `מועד הגשה: ${lead.submissionDeadline}` : null,
    lead.grade ? `המלצת המערכת: ${VERDICT_LABEL[lead.grade.verdict]}` : null,
    lead.flags.length ? `דגלים: ${lead.flags.map((f) => f.title).join(" · ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await structuredCall({
    system: SUMMARY_SYSTEM,
    blocks: [{ type: "text", text: facts }],
    schema: SummarySchema,
    jsonSchema: toJsonSchema(SummarySchema),
    maxTokens: 1024,
  });
  // Normalize dotted dates (07.05.2026) to the app-wide slash format.
  return result.summary.trim().replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g, "$1/$2/$3");
}
