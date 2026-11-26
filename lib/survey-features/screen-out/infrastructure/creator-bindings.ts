import type { SurveyCreatorModel } from "survey-creator-core";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";
import { registerCreatorLogicTrigger } from "@/lib/survey-features/infrastructure/creator-logic-trigger";
import {
  SCREEN_OUT_TRIGGER_CLASS,
  SCREEN_OUT_TRIGGER_TYPE,
} from "../constants";

export function registerScreenOutCreatorUi(): void {
  registerCreatorLogicTrigger({
    type: SCREEN_OUT_TRIGGER_TYPE,
    className: SCREEN_OUT_TRIGGER_CLASS,
    label: "Screen out",
    description:
      "When the logical expression evaluates to true, the survey ends and the respondent is screened out.",
    actionText: "respondent is screened out",
  });
}

export function bindScreenOutToCreator(creator: SurveyCreatorModel): void {
  registerScreenOutCreatorUi();
  // Refresh the visible trigger picker without replacing an open Ace or Preview model.
  const { designer, logic } = SURVEY_CREATOR_BUILT_IN_TAB;
  creator.updateLocalizedStrings(creator.activeTab === designer || creator.activeTab === logic);
}
