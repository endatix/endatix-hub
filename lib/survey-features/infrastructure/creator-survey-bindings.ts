import type { Model } from "survey-core";
import type {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";

const DESIGNER_TAB_SURVEY_AREA = "designer-tab";
const PREVIEW_TAB_SURVEY_AREA = "preview-tab";

const CREATOR_PREVIEW_SURVEY_AREAS = new Set([
  DESIGNER_TAB_SURVEY_AREA,
  PREVIEW_TAB_SURVEY_AREA,
]);

/**
 * Binds a survey-level feature handler to Creator preview instances only
 * (designer and preview tabs), not property grids or internal editor popups.
 */
export function bindSurveyToCreatorAreas(
  creator: SurveyCreatorModel,
  boundKey: string,
  bindSurvey: (survey: Model) => () => void,
): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;

  if (creatorWithFlags[boundKey]) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[survey-features] bindSurveyToCreatorAreas: "${boundKey}" already bound on this creator; skipping duplicate bind.`,
      );
    }
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
    if (!CREATOR_PREVIEW_SURVEY_AREAS.has(options.area)) {
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
