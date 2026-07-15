import type { Lead, LeadDocument, LeadForm } from "@/lib/domain/types";
import { DocType } from "@/lib/domain/enums";
import type { PackItem } from "@/components/leads/AppraiserPackModal";

/**
 * Derive the "חבילת שמאי" readiness checklist from what we already hold: the
 * document set + a couple of known facts + form state. Pure so the lead page can
 * compute it server-side and hand the result to the client ActionBar.
 */
export function appraiserPack(
  lead: Lead,
  documents: LeadDocument[],
  form: LeadForm | null,
): PackItem[] {
  const hasDoc = (type: DocType) => documents.some((d) => d.type === type);

  return [
    { label: "נסחי טאבו", ready: hasDoc(DocType.LandRegistry) },
    { label: "תשריט בית משותף", ready: hasDoc(DocType.Blueprint) },
    {
      label: 'תב"ע ומספר תכנית',
      ready: lead.planNumber != null && lead.planStatus !== "unknown",
    },
    {
      label: "שאלון ומענה מהמארגן",
      ready: form?.status === "submitted" || hasDoc(DocType.Questionnaire),
    },
    {
      label: "טבלת בעלים / אחוזי חתימות",
      ready: lead.signaturePct != null,
    },
  ];
}
