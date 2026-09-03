import { FORM_DIAGNOSTICS_PLUGIN_NAME } from "@/lib/survey-features/form-diagnostics/constants";
import {
  canonicalizeSurveyCreatorTabId,
  SURVEY_CREATOR_BUILT_IN_TAB,
  type SurveyCreatorBuiltInTabId,
} from "./built-in-tabs";

/**
 * Hub Creator tabs: SurveyJS built-ins plus platform plugin tabs.
 * Plugin id strings stay owned by the slice that registers them.
 */
export const ENDATIX_CREATOR_TAB = {
  ...SURVEY_CREATOR_BUILT_IN_TAB,
  diagnostics: FORM_DIAGNOSTICS_PLUGIN_NAME,
} as const;

export type EndatixCreatorPluginTabId = typeof FORM_DIAGNOSTICS_PLUGIN_NAME;

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
  if (isEndatixCreatorTabId(value)) {
    return value;
  }
  return null;
}
