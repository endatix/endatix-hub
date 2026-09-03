import {
  canonicalizeSurveyCreatorTabId,
  SURVEY_CREATOR_BUILT_IN_TAB,
  type SurveyCreatorBuiltInTabId,
} from "./built-in-tabs";

export const ENDATIX_CREATOR_TAB = {
  ...SURVEY_CREATOR_BUILT_IN_TAB,
  diagnostics: "form-diagnostics",
} as const;

export type EndatixCreatorPluginTabId =
  (typeof ENDATIX_CREATOR_TAB)["diagnostics"];

export type EndatixCreatorTabId =
  | SurveyCreatorBuiltInTabId
  | EndatixCreatorPluginTabId;

export const DEFAULT_CREATOR_TAB: EndatixCreatorTabId =
  SURVEY_CREATOR_BUILT_IN_TAB.designer;

export const ENDATIX_CREATOR_TAB_IDS: readonly EndatixCreatorTabId[] =
  Object.values(ENDATIX_CREATOR_TAB);

const ENDATIX_TAB_ID_SET = new Set<string>(ENDATIX_CREATOR_TAB_IDS);

export function isEndatixCreatorTabId(
  value: string,
): value is EndatixCreatorTabId {
  return ENDATIX_TAB_ID_SET.has(value);
}

export function canonicalizeCreatorTabId(
  value: string,
): EndatixCreatorTabId | null {
  const builtIn = canonicalizeSurveyCreatorTabId(value);
  if (builtIn) {
    return builtIn;
  }
  return isEndatixCreatorTabId(value) ? value : null;
}
