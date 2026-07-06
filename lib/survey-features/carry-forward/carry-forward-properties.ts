import type { IJsonPropertyInfo, SurveyModel } from "survey-core";
import {
  getAllSelectBasedQuestions,
  getAllUniqueChoices,
} from "@/lib/survey-features/question-loops/loop-utils";
import { DATA_LIST_PROPERTY_NAME } from "@/lib/survey-features/data-lists/constants";
import { isChoiceSourceSectionAvailable } from "@/lib/survey-features/infrastructure/choice-source-mutual-exclusion";
import {
  CARRY_FORWARD_CHOICES_CATEGORY,
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "./constants";
import {
  CARRY_FORWARD_MODE_VALUES,
  DEFAULT_CARRY_FORWARD_MODE,
} from "./carry-forward-mode-values";
import type { CarryForwardVisibleQuestion } from "./types";
import { getCarryForwardSourceQuestions } from "./utils/carry-forward-target-query";
import { normalizeChoiceKey } from "@/lib/utils/survey";

export function isCarryForwardChoicesSectionVisible(
  obj: CarryForwardVisibleQuestion,
): boolean {
  return isChoiceSourceSectionAvailable(obj);
}

export {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from "./types";

export function isCarryForwardFeatureVisible(
  obj: CarryForwardVisibleQuestion,
): boolean {
  return (
    isCarryForwardChoicesSectionVisible(obj) &&
    obj.edxCarryForwardEnabled === true
  );
}

const CARRY_FORWARD_SECTION_DEPENDS_ON = [
  DATA_LIST_PROPERTY_NAME,
  "choicesByUrl",
  "choicesFromQuestion",
] as const;

const CARRY_FORWARD_FEATURE_DEPENDS_ON = [
  CARRY_FORWARD_ENABLED_PROPERTY,
  ...CARRY_FORWARD_SECTION_DEPENDS_ON,
] as const;

const ENABLED_PROPERTY: IJsonPropertyInfo = {
  name: CARRY_FORWARD_ENABLED_PROPERTY,
  displayName: "Carry forward",
  category: CARRY_FORWARD_CHOICES_CATEGORY,
  type: "boolean",
  default: false,
  visibleIndex: 1,
  dependsOn: [...CARRY_FORWARD_SECTION_DEPENDS_ON],
  visibleIf: isCarryForwardChoicesSectionVisible,
};

const SOURCES_PROPERTY: IJsonPropertyInfo = {
  name: CARRY_FORWARD_SOURCES_PROPERTY,
  dependsOn: [...CARRY_FORWARD_FEATURE_DEPENDS_ON],
  displayName: "Copy choices from questions",
  category: CARRY_FORWARD_CHOICES_CATEGORY,
  type: "multiplevalues",
  visibleIndex: 2,
  visibleIf: isCarryForwardFeatureVisible,
  choices: function (
    obj: { survey: SurveyModel; name: string },
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const survey = obj ? obj.survey : null;

    if (!survey || typeof choicesCallback !== "function") {
      return;
    }

    const filteredChoices = getAllSelectBasedQuestions(survey)
      .filter((selectQuestion) => selectQuestion.name !== obj.name)
      .map((selectQuestion) => ({
        value: selectQuestion.name,
        text: selectQuestion.name,
      }));

    choicesCallback(filteredChoices);
  },
};

const MODE_PROPERTY: IJsonPropertyInfo = {
  name: CARRY_FORWARD_MODE_PROPERTY,
  dependsOn: [...CARRY_FORWARD_FEATURE_DEPENDS_ON],
  displayName: "Which choice options to copy",
  category: CARRY_FORWARD_CHOICES_CATEGORY,
  type: "string",
  default: DEFAULT_CARRY_FORWARD_MODE,
  visibleIndex: 3,
  choices: [...CARRY_FORWARD_MODE_VALUES],
  visibleIf: isCarryForwardFeatureVisible,
};

const PRIORITY_ITEMS_PROPERTY: IJsonPropertyInfo = {
  name: CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  dependsOn: [
    ...CARRY_FORWARD_FEATURE_DEPENDS_ON,
    CARRY_FORWARD_SOURCES_PROPERTY,
  ],
  displayName: "Priority items",
  category: CARRY_FORWARD_CHOICES_CATEGORY,
  type: "multiplevalues",
  visibleIndex: 4,
  visibleIf: isCarryForwardFeatureVisible,
  choices: function (
    obj: { survey: SurveyModel; edxCarryForwardSources?: string[] },
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const { survey, edxCarryForwardSources } = obj || {};

    if (
      !survey ||
      !edxCarryForwardSources ||
      typeof choicesCallback !== "function"
    ) {
      return;
    }

    const sourceQuestions = getCarryForwardSourceQuestions(survey, {
      edxCarryForwardSources,
    });

    const uniqueChoices = getAllUniqueChoices(
      sourceQuestions,
      (question, choice) => `${question.name}: (${choice.value})`,
    );

    choicesCallback(
      uniqueChoices.map((choice) => ({
        value: normalizeChoiceKey(choice.value),
        text: String(choice.text ?? choice.value),
      })),
    );
  },
};

const MAX_CHOICES_PROPERTY: IJsonPropertyInfo = {
  name: CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  dependsOn: [...CARRY_FORWARD_FEATURE_DEPENDS_ON],
  displayName: "Maximum number of choices",
  category: CARRY_FORWARD_CHOICES_CATEGORY,
  type: "number",
  default: 0,
  minValue: 0,
  visibleIndex: 5,
  visibleIf: isCarryForwardFeatureVisible,
};

export const CARRY_FORWARD_PROPERTIES: IJsonPropertyInfo[] = [
  ENABLED_PROPERTY,
  SOURCES_PROPERTY,
  MODE_PROPERTY,
  PRIORITY_ITEMS_PROPERTY,
  MAX_CHOICES_PROPERTY,
];
