import { getLocaleStrings, SurveyLogic } from "survey-creator-core";
import {
  SCREEN_OUT_TRIGGER_CLASS,
  SCREEN_OUT_TRIGGER_TYPE,
} from "../constants";

const LOGIC_NAME = `trigger_${SCREEN_OUT_TRIGGER_TYPE}`;

export function registerScreenOutLogicAction(): void {
  const types = SurveyLogic.types as Array<{ name: string }>;
  if (!types.some((type) => type.name === LOGIC_NAME)) {
    types.push({
      name: LOGIC_NAME,
      baseClass: SCREEN_OUT_TRIGGER_CLASS,
      propertyName: "expression",
      isUniqueItem: true,
      isInvisible: true,
    } as (typeof types)[number]);
  }

  const translations = getLocaleStrings("en");
  translations.triggers[SCREEN_OUT_TRIGGER_CLASS] = "Screen out";
  translations.ed.lg[`${LOGIC_NAME}Name`] = "Screen out";
  translations.ed.lg[`${LOGIC_NAME}Description`] =
    "When the logical expression evaluates to true, the survey ends and the respondent is screened out.";
  translations.ed.lg[`${LOGIC_NAME}Text`] = "respondent is screened out";
}
