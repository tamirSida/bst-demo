/**
 * Seed Firestore for the demo:
 *   1. config/thresholds ← DEFAULT_CONFIG
 *   2. all Excel-imported leads (hydrated + graded)
 *   3. the real הדרים lead + its form, timeline, outbound (from the cached
 *      pipeline result, so this step needs no API key)
 *
 * Run: FIREBASE_SERVICE_ACCOUNT=... npx tsx scripts/seed.ts
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEFAULT_CONFIG } from "../lib/domain/config";
import { createLead, recomputeTriage } from "../lib/domain/lead";
import type { Lead } from "../lib/domain/types";
import type { IngestResult } from "../lib/ai/pipeline";
import {
  addTimelineEvent,
  getConfig,
  logOutbound,
  saveConfig,
  saveForm,
  saveLead,
  saveLeadsBatch,
} from "../lib/firebase/repo";

const SEED = resolve(process.cwd(), "data", "seed");

async function seedExcelLeads() {
  const raw = await readFile(resolve(SEED, "leads.json"), "utf8");
  const rows = JSON.parse(raw) as Array<Partial<Lead> & { dealType: Lead["dealType"] }>;
  const config = await getConfig();
  const leads = rows.map((row) => {
    const lead = recomputeTriage(createLead(row as never), config);
    // Mark as seed data so the "show seed data" toggle can hide it.
    return { ...lead, extra: { ...lead.extra, origin: "seed" } };
  });
  await saveLeadsBatch(leads);
  console.log(`  ✓ ${leads.length} leads מ-Excel`);
}

async function seedHadarim() {
  let raw: string;
  try {
    raw = await readFile(resolve(SEED, "hadarim.json"), "utf8");
  } catch {
    console.log("  ⚠ hadarim.json חסר — הרץ קודם: npx tsx scripts/ingest-hadarim.ts");
    return;
  }
  const result = JSON.parse(raw) as IngestResult;
  const lead = { ...result.lead, extra: { ...result.lead.extra, origin: "seed" } };
  await saveLead(lead);
  if (result.form) await saveForm(result.form);
  if (result.outbound) await logOutbound(result.outbound);
  for (const evt of result.timeline) await addTimelineEvent(evt);
  console.log(`  ✓ הדרים 21-23 (${result.form?.questions.length ?? 0} שאלות טופס)`);
}

async function main() {
  console.log("Seeding Firestore …");
  await saveConfig(DEFAULT_CONFIG);
  console.log("  ✓ config/thresholds");
  await seedExcelLeads();
  await seedHadarim();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
