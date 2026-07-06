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

export const CARRY_FORWARD_ENABLED_PROPERTY = "edxCarryForwardEnabled";
export const CARRY_FORWARD_SOURCES_PROPERTY = "edxCarryForwardSources";
export const CARRY_FORWARD_MODE_PROPERTY = "edxCarryForwardMode";
export const CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY =
  "edxCarryForwardPriorityItems";
export const CARRY_FORWARD_MAX_CHOICES_PROPERTY =
  "edxCarryForwardMaxChoices";

export const CARRY_FORWARD_HANDLERS_ATTACHED_KEY =
  "__endatixCarryForwardBound";
