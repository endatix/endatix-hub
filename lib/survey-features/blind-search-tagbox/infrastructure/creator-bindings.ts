import type { SurveyCreatorModel } from "survey-creator-core";
import { bindSurveyToCreatorAreas } from "@/lib/survey-features/infrastructure/creator-survey-bindings";
import { bindBlindSearchToSurvey } from "./survey-bindings";

const BLIND_SEARCH_CREATOR_BOUND_KEY = "__endatixBlindSearchCreatorBound";

export function bindBlindSearchToCreator(
  creator: SurveyCreatorModel,
): () => void {
  return bindSurveyToCreatorAreas(
    creator,
    BLIND_SEARCH_CREATOR_BOUND_KEY,
    bindBlindSearchToSurvey,
  );
}
