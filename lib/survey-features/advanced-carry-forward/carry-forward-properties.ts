import type { IJsonPropertyInfo, SurveyModel } from 'survey-core';
import {
  getAllSelectBasedQuestions,
  getAllUniqueChoices,
  isSelectBaseQuestion,
} from '@/lib/survey-features/question-loops/loop-utils';
import { SourceSelectionModes } from '@/lib/survey-features/question-loops/types';
import {
  ADVANCED_CARRY_FORWARD_CATEGORY,
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from './constants';
import type { CarryForwardVisibleQuestion } from './types';
import {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from './types';

export function isCarryForwardCategoryVisible(
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
    isCarryForwardCategoryVisible(obj) &&
    obj.advancedCarryForwardEnabled === true
  );
}

const ENABLED_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  displayName: 'Enable advanced carry forward',
  category: ADVANCED_CARRY_FORWARD_CATEGORY,
  type: 'boolean',
  default: false,
  visibleIf: isCarryForwardCategoryVisible,
};

const SOURCES_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  displayName: 'Source questions',
  category: ADVANCED_CARRY_FORWARD_CATEGORY,
  type: 'multiplevalues',
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
  displayName: 'Carry forward',
  category: ADVANCED_CARRY_FORWARD_CATEGORY,
  type: 'dropdown',
  default: SourceSelectionModes.All,
  choices: Object.values(SourceSelectionModes),
  visibleIf: isCarryForwardFeatureVisible,
};

const PRIORITY_ITEMS_PROPERTY: IJsonPropertyInfo = {
  name: ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  dependsOn: [ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY],
  displayName: 'Priority items',
  category: ADVANCED_CARRY_FORWARD_CATEGORY,
  type: 'multiplevalues',
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
  displayName: 'Maximum number of choices',
  category: ADVANCED_CARRY_FORWARD_CATEGORY,
  type: 'number',
  default: 0,
  minValue: 0,
  visibleIf: isCarryForwardFeatureVisible,
};

export const ADVANCED_CARRY_FORWARD_PROPERTIES: IJsonPropertyInfo[] = [
  ENABLED_PROPERTY,
  SOURCES_PROPERTY,
  MODE_PROPERTY,
  PRIORITY_ITEMS_PROPERTY,
  MAX_CHOICES_PROPERTY,
];
