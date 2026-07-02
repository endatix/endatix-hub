import type { IJsonPropertyInfo, SurveyModel } from 'survey-core';
import {
  getAllSelectBasedQuestions,
  getAllUniqueChoices,
  isSelectBaseQuestion,
} from '@/lib/survey-features/question-loops/loop-utils';
import {
  ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from './constants';
import {
  ADVANCED_CARRY_FORWARD_MODE_VALUES,
  DEFAULT_ADVANCED_CARRY_FORWARD_MODE,
} from './carry-forward-mode-values';
import type { CarryForwardVisibleQuestion } from './types';
import {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from './types';

export function isCarryForwardChoicesSectionVisible(
  obj: CarryForwardVisibleQuestion,
): boolean {
  return (
    !obj.edxDataListId &&
    !isChoicesByUrlConfigured(obj) &&
    !isChoicesFromQuestionConfigured(obj)
  );
}

export {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from './types';

export function isCarryForwardFeatureVisible(
  obj: CarryForwardVisibleQuestion,
): boolean {
  return (
    isCarryForwardChoicesSectionVisible(obj) &&
    obj.advancedCarryForwardEnabled === true
  );
}

const ENABLED_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  displayName: 'Advanced carry forward',
  category: ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  type: 'boolean',
  default: false,
  visibleIndex: 1,
  visibleIf: isCarryForwardChoicesSectionVisible,
};

const SOURCES_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  dependsOn: [ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY],
  displayName: 'Copy choices from questions',
  category: ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  type: 'multiplevalues',
  visibleIndex: 2,
  visibleIf: isCarryForwardFeatureVisible,
  choices: function (
    obj: { survey: SurveyModel; name: string },
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const survey = obj ? obj.survey : null;

    if (!survey || typeof choicesCallback !== 'function') {
      if (typeof choicesCallback === 'function') {
        choicesCallback([]);
      }
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
  name: ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  dependsOn: [ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY],
  displayName: 'Which choice options to copy',
  category: ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  type: 'string',
  default: DEFAULT_ADVANCED_CARRY_FORWARD_MODE,
  visibleIndex: 3,
  choices: [...ADVANCED_CARRY_FORWARD_MODE_VALUES],
  visibleIf: isCarryForwardFeatureVisible,
};

const PRIORITY_ITEMS_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  dependsOn: [
    ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
    ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  ],
  displayName: 'Priority items',
  category: ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  type: 'multiplevalues',
  visibleIndex: 4,
  visibleIf: isCarryForwardFeatureVisible,
  choices: function (
    obj: { survey: SurveyModel; advancedCarryForwardSources?: string[] },
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const { survey, advancedCarryForwardSources } = obj || {};

    if (
      !survey ||
      !advancedCarryForwardSources ||
      typeof choicesCallback !== 'function'
    ) {
      if (typeof choicesCallback === 'function') {
        choicesCallback([]);
      }
      return;
    }

    const sourceQuestions = advancedCarryForwardSources
      .map((name) => survey.getQuestionByName(name))
      .filter(isSelectBaseQuestion);

    const uniqueChoices = getAllUniqueChoices(
      sourceQuestions,
      (question, choice) => `${question.name}: (${choice.value})`,
    );

    choicesCallback(
      uniqueChoices.map((choice) => ({
        value: String(choice.value),
        text: String(choice.text ?? choice.value),
      })),
    );
  },
};

const MAX_CHOICES_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  dependsOn: [ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY],
  displayName: 'Maximum number of choices',
  category: ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  type: 'number',
  default: 0,
  minValue: 0,
  visibleIndex: 5,
  visibleIf: isCarryForwardFeatureVisible,
};

export const ADVANCED_CARRY_FORWARD_PROPERTIES: IJsonPropertyInfo[] = [
  ENABLED_PROPERTY,
  SOURCES_PROPERTY,
  MODE_PROPERTY,
  PRIORITY_ITEMS_PROPERTY,
  MAX_CHOICES_PROPERTY,
];
