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

function bindBlindSearchToCreator(creator: SurveyCreatorModel): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel & Record<string, unknown>;
  if (creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[BLIND_SEARCH_CREATOR_BOUND_KEY] = true;

  const creatorSurveyDisposers = new Map<string, () => void>();

  const handleSurveyInstanceCreated = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ) => {
    if (options.area === "property-grid") {
      return;
    }

    const previousDispose = creatorSurveyDisposers.get(options.area);
    previousDispose?.();

    const dispose = bindBlindSearchToSurvey(options.survey);
    creatorSurveyDisposers.set(options.area, dispose);
  };

  creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

  if (creator.survey) {
    const initialSurveyArea = "__creator-initial-survey";
    const previousDispose = creatorSurveyDisposers.get(initialSurveyArea);
    previousDispose?.();

    const dispose = bindBlindSearchToSurvey(creator.survey);
    creatorSurveyDisposers.set(initialSurveyArea, dispose);
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
