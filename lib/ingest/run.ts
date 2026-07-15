import "server-only";
import { parseEml } from "../eml/parse";
import { runIngestPipeline } from "../ai/pipeline";
import { getConfig, findDuplicate } from "../firebase/repo";
import { persistIngestResult } from "./persist";

/**
 * Full inbound path: raw .eml → parsed → triaged lead → persisted + outbound.
 * Shared by the demo upload route and the live email webhook.
 */
export async function ingestRawEmail(raw: Buffer): Promise<{ leadId: string }> {
  const email = await parseEml(raw);
  const config = await getConfig();
  const formBaseUrl = `${process.env.APP_URL ?? ""}/f/`;

  const result = await runIngestPipeline(email, { config, findDuplicate, formBaseUrl });
  await persistIngestResult(result);
  return { leadId: result.lead.id };
}
