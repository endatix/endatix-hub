import type { Model } from 'survey-core';
import type {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from 'survey-creator-core';

const PROPERTY_GRID_AREA = 'property-grid';
const DESIGNER_TAB_SURVEY_AREA = 'designer-tab';

/**
 * Binds a survey-level feature handler to Creator preview instances (not property-grid).
 */
export function bindSurveyToCreatorAreas(
  creator: SurveyCreatorModel,
  boundKey: string,
  bindSurvey: (survey: Model) => () => void,
): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;

  if (creatorWithFlags[boundKey]) {
    return () => {};
  }

  creatorWithFlags[boundKey] = true;

  const creatorSurveyDisposers = new Map<string, () => void>();

  function bindSurveyForCreatorArea(area: string, survey: Model): void {
    const previousDispose = creatorSurveyDisposers.get(area);
    previousDispose?.();

    const dispose = bindSurvey(survey);
    creatorSurveyDisposers.set(area, dispose);
  }

  const handleSurveyInstanceCreated = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ) => {
    if (options.area === PROPERTY_GRID_AREA) {
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
    creatorWithFlags[boundKey] = false;
  };
}
