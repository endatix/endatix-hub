import {
  getLocaleStrings,
  type SurveyCreatorModel,
} from "survey-creator-core";
import { bindSurveyToCreatorAreas } from "@/lib/survey-features/infrastructure/creator-survey-bindings";
import {
  CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY,
  COMPLETE_TRIGGER_NAVIGATION_CREATOR_BOUND_KEY,
} from "../constants";
import { bindChangeNavigationButtonsOnComplete } from "./survey-bindings";

export function registerCompleteTriggerNavigationPropertyHelp(): void {
  const translations = getLocaleStrings("en");
  translations.pehelp[CHANGE_NAVIGATION_BUTTONS_ON_COMPLETE_PROPERTY] =
    "When on, Next becomes Complete as soon as a Complete trigger's expression is true. When off, Next stays until the respondent moves on, and the form still completes then.";
}

export function bindChangeNavigationButtonsOnCompleteToCreator(
  creator: SurveyCreatorModel,
): () => void {
  return bindSurveyToCreatorAreas(
    creator,
    COMPLETE_TRIGGER_NAVIGATION_CREATOR_BOUND_KEY,
    bindChangeNavigationButtonsOnComplete,
  );
}
