import { DocType } from "../domain/enums";

/**
 * Classify an attachment by its (Hebrew) filename. Reliable for the BST tender
 * corpus and far cheaper than asking the model — keeps the extraction schema
 * small enough to compile.
 */
export function classifyDoc(fileName: string): DocType {
  const n = fileName.toLowerCase();
  if (/שאלון.*השלמ|הצעת זהב|השלמ.*שאלון/.test(fileName)) return DocType.QuestionnaireSupplement;
  if (/שאלון/.test(fileName)) return DocType.Questionnaire;
  if (/הזמנה|טמפלט|קול קורא/.test(fileName)) return DocType.Invitation;
  if (/הסכם.*מארגנ|מארגנ/.test(fileName)) return DocType.OrganizersAgreement;
  if (/הסכם|טיוטת/.test(fileName)) return DocType.Agreement;
  if (/נסח|טאבו/.test(fileName)) return DocType.LandRegistry;
  if (/תשריט|בית משותף/.test(fileName)) return DocType.Blueprint;
  if (/מדיניות|נספח/.test(fileName)) return DocType.Policy;
  return DocType.Other;
}
