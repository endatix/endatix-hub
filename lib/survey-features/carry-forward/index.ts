export {
  CARRY_FORWARD_EXTENSION_ID,
  CARRY_FORWARD_CHOICES_CATEGORY,
  CARRY_FORWARD_QUESTION_TYPES,
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
} from "./constants";
export { carryForwardExtension } from "./infrastructure/carry-forward.extension";
export { registerCarryForwardForQuestionType } from "./infrastructure/registry";
export type { AdvancedCarryForwardQuestion } from "./types";
