import "server-only";
import type { IngestResult } from "../ai/pipeline";
import { emailProvider } from "../email/providers";
import { addTimelineEvent, logOutbound, saveForm, saveLead } from "../firebase/repo";

/**
 * Persist a pipeline result and send its outbound email. Shared by the .eml
 * upload route and the inbound email webhook. Sending goes through the provider
 * abstraction — Resend when EMAIL_LIVE=true, otherwise simulated.
 */
export async function persistIngestResult(result: IngestResult): Promise<void> {
  await saveLead(result.lead);
  for (const evt of result.timeline) await addTimelineEvent(evt);
  if (result.form) await saveForm(result.form);

  if (result.outbound) {
    let { status, providerId } = result.outbound;
    if (result.outbound.to) {
      const res = await emailProvider().send({
        to: result.outbound.to,
        subject: result.outbound.subject,
        text: result.outbound.body,
        replyTo: process.env.EMAIL_FROM,
        headers: { "X-BST-Lead": result.lead.threadKey },
      });
      status = res.status;
      providerId = res.id;
    }
    await logOutbound({ ...result.outbound, status, providerId });
  }
}
