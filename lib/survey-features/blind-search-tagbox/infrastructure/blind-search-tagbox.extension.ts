import type { ExtensionModule } from "@/lib/survey-extensions/types";
import {
  registerChoicesLazyLoadCompletedHandler,
  registerChoicesLazyLoadGuard,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { SurveyInstanceCreatedEvent } from "survey-creator-core";
import { registerBlindSearchTagboxGlobals } from "./registry";
import {
  applyBlindSearchOtherFallbackAfterLazyLoad,
  bindBlindSearchToSurvey,
} from "./survey-bindings";
import { shouldSuppressChoices } from "../use-cases/blind-search-state";

const BLIND_SEARCH_CREATOR_BOUND_KEY = "__endatixBlindSearchCreatorBound";
const BLIND_SEARCH_LAZY_LOAD_GUARD_ID = "blind-search-tagbox";
const DESIGNER_TAB_SURVEY_AREA = "designer-tab";

function bindBlindSearchToCreator(creator: SurveyCreatorModel): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel & Record<string, unknown>;
  if (creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY] = true;

  const creatorSurveyDisposers = new Map<string, () => void>();

  const bindSurveyForCreatorArea = (
    area: string,
    survey: SurveyInstanceCreatedEvent["survey"],
  ) => {
    const previousDispose = creatorSurveyDisposers.get(area);
    previousDispose?.();

    const dispose = bindBlindSearchToSurvey(survey);
    creatorSurveyDisposers.set(area, dispose);
  };

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

const blindSearchTagboxExtension: ExtensionModule = {
  onInit: () => {
    registerBlindSearchTagboxGlobals();
    registerChoicesLazyLoadGuard(
      BLIND_SEARCH_LAZY_LOAD_GUARD_ID,
      shouldSuppressChoices,
    );
    registerChoicesLazyLoadCompletedHandler(
      BLIND_SEARCH_LAZY_LOAD_GUARD_ID,
      applyBlindSearchOtherFallbackAfterLazyLoad,
    );
  },
  onCreatorReady: (creator) => {
    bindBlindSearchToCreator(creator);
  },
  onModelReady: (model) => {
    bindBlindSearchToSurvey(model);
  },
};

export { blindSearchTagboxExtension, bindBlindSearchToCreator, bindBlindSearchToSurvey };
