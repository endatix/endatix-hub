import type { Model } from 'survey-core';
import type { SurveyCreatorModel, SurveyInstanceCreatedEvent } from 'survey-creator-core';
import {
  ADVANCED_CARRY_FORWARD_CATEGORY,
  ADVANCED_CARRY_FORWARD_ICON_NAME,
} from '../constants';
import { bindAdvancedCarryForwardToSurvey } from './survey-bindings';

const ADVANCED_CARRY_FORWARD_CREATOR_BOUND_KEY =
  '__endatixAdvancedCarryForwardCreatorBound';
const DESIGNER_TAB_SURVEY_AREA = 'designer-tab';

function decorateCarryForwardPropertyGridCategory(survey: Model): void {
  const category = survey.getPageByName(ADVANCED_CARRY_FORWARD_CATEGORY);

  if (!category) {
    return;
  }

  (category as unknown as { iconName: string }).iconName =
    ADVANCED_CARRY_FORWARD_ICON_NAME;
  category.title = 'Advanced Carry Forward';
}

export const decorateCarryForwardPropertyGridCategoryForTests =
  decorateCarryForwardPropertyGridCategory;

export function bindAdvancedCarryForwardToCreator(
  creator: SurveyCreatorModel,
): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;

  if (creatorWithFlags[ADVANCED_CARRY_FORWARD_CREATOR_BOUND_KEY]) {
    return () => {};
  }

  creatorWithFlags[ADVANCED_CARRY_FORWARD_CREATOR_BOUND_KEY] = true;

  const creatorSurveyDisposers = new Map<string, () => void>();

  function bindSurveyForCreatorArea(area: string, survey: Model): void {
    const previousDispose = creatorSurveyDisposers.get(area);
    previousDispose?.();

    const dispose = bindAdvancedCarryForwardToSurvey(survey);
    creatorSurveyDisposers.set(area, dispose);
  }

  const handleSurveyInstanceCreated = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ) => {
    if (options.area === 'property-grid') {
      decorateCarryForwardPropertyGridCategory(options.survey);
      return;
    }

    bindSurveyForCreatorArea(options.area, options.survey);
  };

  creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

  if (creator.survey) {
    bindSurveyForCreatorArea(DESIGNER_TAB_SURVEY_AREA, creator.survey);
  }

  return () => {
    creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
    creatorSurveyDisposers.forEach((dispose) => dispose?.());
    creatorSurveyDisposers.clear();
    creatorWithFlags[ADVANCED_CARRY_FORWARD_CREATOR_BOUND_KEY] = false;
  };
}
