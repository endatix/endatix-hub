export const CARRY_FORWARD_EXTENSION_ID = "carry-forward";

/** SurveyJS Serializer category for choice-source settings in Creator. */
export const CARRY_FORWARD_CHOICES_CATEGORY = "choices";

/** Question types that extend QuestionSelectBase (Serializer registration). */
export const CARRY_FORWARD_QUESTION_TYPES = [
  "checkbox",
  "radiogroup",
  "dropdown",
  "tagbox",
  "imagepicker",
  "ranking",
  "buttongroup",
] as const;

export const CARRY_FORWARD_ENABLED_PROPERTY =
  "advancedCarryForwardEnabled";
export const CARRY_FORWARD_SOURCES_PROPERTY =
  "advancedCarryForwardSources";
export const CARRY_FORWARD_MODE_PROPERTY = "advancedCarryForwardMode";
export const CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY =
  "advancedCarryForwardPriorityItems";
export const CARRY_FORWARD_MAX_CHOICES_PROPERTY =
  "advancedCarryForwardMaxChoices";

export const CARRY_FORWARD_HANDLERS_ATTACHED_KEY =
  "__endatixAdvancedCarryForwardBound";
