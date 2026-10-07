import {
  editorLocalization,
  getLocaleStrings,
  SurveyLogic,
} from "survey-creator-core";
import {
  SCREEN_OUT_TRIGGER_CLASS,
  SCREEN_OUT_TRIGGER_TYPE,
} from "../constants";

const LOGIC_NAME = `trigger_${SCREEN_OUT_TRIGGER_TYPE}`;
const SCREEN_OUT_LABEL = "Screen out";

type CreatorLocale = {
  triggers?: Record<string, string>;
  ed?: { lg?: Record<string, string> };
};

function labelScreenOutTrigger(locale: CreatorLocale | undefined): void {
  if (!locale?.triggers || !locale.ed?.lg) {
    return;
  }

  locale.triggers[SCREEN_OUT_TRIGGER_CLASS] = SCREEN_OUT_LABEL;
  locale.ed.lg[`${LOGIC_NAME}Name`] = SCREEN_OUT_LABEL;
  locale.ed.lg[`${LOGIC_NAME}Description`] =
    "When the logical expression evaluates to true, the survey ends and the respondent is screened out.";
  locale.ed.lg[`${LOGIC_NAME}Text`] = "respondent is screened out";
}

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

  // Property-grid choices call editorLocalization.getTriggerName, which reads
  // triggers.<className>. The Logic tab reads ed.lg. SurveyCreator copies both
  // while it constructs, so call this before new SurveyCreator.
  labelScreenOutTrigger(editorLocalization.getLocale(""));
  labelScreenOutTrigger(getLocaleStrings("en"));
}
