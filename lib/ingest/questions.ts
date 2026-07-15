import "server-only";
import { analyzeGaps } from "../ai/gaps";
import { LeadStatus } from "../domain/enums";
import { displayName } from "../domain/lead";
import type { LeadForm, OutboundEmail } from "../domain/types";
import { emailProvider } from "../email/providers";
import {
  addTimelineEvent,
  getLead,
  logOutbound,
  saveForm,
  updateLead,
} from "../firebase/repo";

function id(): string {
  return globalThis.crypto?.randomUUID?.().replace(/-/g, "") ?? `t_${Date.now()}`;
}

/**
 * The real "שלח שאלות" flow: re-run the AI gap analysis on the lead's CURRENT
 * facts, build a fresh form, and send the link to the lead's contact (through
 * the provider layer — live via Resend, honoring the safety redirect).
 * Returns what happened so the UI can explain it to the user.
 */
export async function regenerateAndSendQuestions(leadId: string): Promise<{
  ok: boolean;
  questionCount: number;
  sentTo: string | null;
  status: "sent" | "simulated" | "failed" | "no_questions" | "no_contact";
}> {
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, questionCount: 0, sentTo: null, status: "failed" };

  const questions = await analyzeGaps(lead);
  if (questions.length === 0) {
    return { ok: true, questionCount: 0, sentTo: null, status: "no_questions" };
  }

  const now = new Date().toISOString();
  const form: LeadForm = {
    id: id(),
    leadId: lead.id,
    token: id(),
    title: `השלמת פרטים — ${displayName(lead)}`,
    questions,
    answers: {},
    status: "sent",
    createdAt: now,
    sentAt: now,
    openedAt: null,
    submittedAt: null,
  };
  await saveForm(form);

  const to = lead.contact?.email ?? null;
  const url = `${process.env.APP_URL ?? ""}/f/${form.token}`;
  const body = [
    "שלום רב,",
    "",
    `בהמשך לפנייתכם בנוגע לפרויקט «${lead.projectName}»${lead.city ? ` ב${lead.city}` : ""},`,
    "נודה להשלמת מספר פרטים נוספים בקישור הבא:",
    "",
    url,
    "",
    `[${lead.threadKey}]`,
    "",
    "בברכה,",
    "צוות הפיתוח העסקי — קבוצת BST",
  ].join("\n");

  let status: "sent" | "simulated" | "failed" | "no_contact" = "no_contact";
  let providerId: string | null = null;
  if (to) {
    const res = await emailProvider().send({
      to,
      subject: `השלמת פרטים — ${lead.projectName} [${lead.threadKey}]`,
      text: body,
      replyTo: process.env.EMAIL_FROM,
      headers: { "X-BST-Lead": lead.threadKey },
    });
    status = res.status;
    providerId = res.id;
  }

  const outbound: OutboundEmail = {
    id: id(),
    leadId: lead.id,
    to: to ?? "",
    subject: `השלמת פרטים — ${lead.projectName}`,
    templateKey: "form_request_followup",
    body,
    status: status === "no_contact" ? "failed" : status,
    providerId,
    at: now,
  };
  await logOutbound(outbound);

  await updateLead(lead.id, { status: LeadStatus.AwaitingInfo });
  await addTimelineEvent({
    id: id(),
    leadId: lead.id,
    at: now,
    kind: "form_sent",
    title:
      status === "sent"
        ? `נשלח טופס שאלות חדש (${questions.length} שאלות) אל ${to}`
        : `נוצר טופס שאלות חדש (${questions.length} שאלות)${to ? "" : " — לא נמצאה כתובת מייל לשליחה"}`,
  });

  return { ok: true, questionCount: questions.length, sentTo: to, status };
}
