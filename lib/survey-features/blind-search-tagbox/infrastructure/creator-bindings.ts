import type { Model } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { SurveyInstanceCreatedEvent } from "survey-creator-core";
import { bindBlindSearchToSurvey } from "./survey-bindings";

const BLIND_SEARCH_CREATOR_BOUND_KEY = "__endatixBlindSearchCreatorBound";
const DESIGNER_TAB_SURVEY_AREA = "designer-tab";

export function bindBlindSearchToCreator(
  creator: SurveyCreatorModel,
): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;
  if (creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY] = true;

  const creatorSurveyDisposers = new Map<string, () => void>();

  function bindSurveyForCreatorArea(area: string, survey: Model): void {
    const previousDispose = creatorSurveyDisposers.get(area);
    previousDispose?.();

    const dispose = bindBlindSearchToSurvey(survey);
    creatorSurveyDisposers.set(area, dispose);
  }

  const handleSurveyInstanceCreated = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ) => {
    if (options.area === "property-grid") {
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
    creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY] = false;
  };
}
