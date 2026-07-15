/**
 * Validate the AI pipeline on the REAL הדרים 21-23 לוד thread, and cache the
 * full result to data/seed/hadarim.json so the Firestore seed needs no API key.
 *
 * The (3) email body carries the golden facts Adi wrote (36 יח"ד, 5.6 דונם,
 * צפיפות 6.4, תב"ע 406-1063890); we enrich it with the real invitation and
 * questionnaire PDFs so the extractor sees the full tender.
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx scripts/ingest-hadarim.ts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseEml, type EmailAttachment } from "../lib/eml/parse";
import { runIngestPipeline } from "../lib/ai/pipeline";
import { DEFAULT_CONFIG } from "../lib/domain/config";

const BST = resolve(process.cwd(), "..", "BST_files");
const OUT = resolve(process.cwd(), "data", "seed", "hadarim.json");

const EML = "RE_ הדרים 21-23 לוד (להלן_ _הפרוייקט_) - הזמנה להציע הצעות (3).eml";
const ENRICH_PDFS = [
  "(247)שאלון ליזמים - מתחם הדרים  21-23.pdf",
  "(245)טמפלט הזמנה ליזמים להציע הצעות בהתחדשות עירונית 2024 - הדרים  (003).pdf",
];

async function main() {
  const raw = await readFile(resolve(BST, EML));
  const email = await parseEml(raw);

  // Enrich with the real tender PDFs so the extractor has the full context.
  for (const name of ENRICH_PDFS) {
    const content = await readFile(resolve(BST, name));
    const doc: EmailAttachment = {
      filename: name,
      contentType: "application/pdf",
      content,
      sizeBytes: content.length,
    };
    email.documents.push(doc);
  }

  console.log(`Ingesting «${EML}» + ${ENRICH_PDFS.length} tender PDFs …`);
  const result = await runIngestPipeline(email, {
    config: DEFAULT_CONFIG,
    threadSeq: 42,
    formBaseUrl: "/f/",
  });

  const { lead, form, outbound } = result;
  console.log("\n=== LEAD FACTS ===");
  console.log({
    project: lead.projectName,
    city: lead.city,
    unitsExisting: lead.unitsExisting,
    unitsPlanned: lead.unitsPlanned,
    lotAreaDunam: lead.lotAreaDunam,
    planStatus: lead.planStatus,
    planNumber: lead.planNumber,
    deadline: lead.submissionDeadline,
    contact: lead.contact,
  });
  console.log("\n=== FLAGS ===");
  for (const f of lead.flags) console.log(`  [${f.severity}] ${f.title} — ${f.rule}`);
  console.log("\n=== GRADE ===", lead.grade);
  console.log("\n=== SUMMARY ===\n", lead.aiSummary);
  console.log("\n=== FORM QUESTIONS ===");
  for (const q of form?.questions ?? []) console.log(`  • (${q.kind}) ${q.label}`);
  console.log("\n=== OUTBOUND ===\n", outbound?.body);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(result, null, 2), "utf8");
  console.log(`\nCached full result → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
