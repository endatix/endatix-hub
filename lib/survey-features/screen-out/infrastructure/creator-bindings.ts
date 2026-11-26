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
  // The JSON tab has no trigger picker. Rebuilding it replaces the plugin's
  // model while its mounted Ace editor is still bound to the previous one.
  creator.updateLocalizedStrings(creator.activeTab !== SURVEY_CREATOR_BUILT_IN_TAB.json);
}
