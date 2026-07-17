import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleCheck,
  faCircleQuestion,
  faCircleXmark,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";
import type { Verdict } from "@/lib/domain/enums";

/**
 * Verdict → icon. One source of truth shared by the VerdictBanner (lead detail)
 * and the GradeCell (leads table), so both read as the same visual language.
 */
export const VERDICT_ICON: Record<Verdict, IconDefinition> = {
  advance: faCircleCheck,
  review: faCircleQuestion,
  curable: faWrench,
  reject: faCircleXmark,
  killed: faCircleXmark,
};
