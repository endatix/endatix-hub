/**
 * Closed set of Survey Creator built-in plugin `name` / `activeTab` values.
 * Creator types `activeTab` as `string`; this union is the subset Hub relies on.
 * Preview was historically `test`; current Creator uses `preview`.
 */
export const SURVEY_CREATOR_BUILT_IN_TAB = {
  designer: "designer",
  preview: "preview",
  theme: "theme",
  json: "json",
  translation: "translation",
  logic: "logic",
} as const;

export type SurveyCreatorBuiltInTabId =
  (typeof SURVEY_CREATOR_BUILT_IN_TAB)[keyof typeof SURVEY_CREATOR_BUILT_IN_TAB];

export const SURVEY_CREATOR_BUILT_IN_TAB_IDS: readonly SurveyCreatorBuiltInTabId[] =
  Object.values(SURVEY_CREATOR_BUILT_IN_TAB);

const BUILT_IN_TAB_ID_SET = new Set<string>(SURVEY_CREATOR_BUILT_IN_TAB_IDS);

/** Legacy Creator preview tab id still seen on `activeTab` / events. */
export const SURVEY_CREATOR_LEGACY_PREVIEW_TAB_ID = "test";

export function isSurveyCreatorBuiltInTabId(
  value: string,
): value is SurveyCreatorBuiltInTabId {
  return BUILT_IN_TAB_ID_SET.has(value);
}

export function canonicalizeSurveyCreatorTabId(
  value: string,
): SurveyCreatorBuiltInTabId | null {
  if (value === SURVEY_CREATOR_LEGACY_PREVIEW_TAB_ID) {
    return SURVEY_CREATOR_BUILT_IN_TAB.preview;
  }
  if (isSurveyCreatorBuiltInTabId(value)) {
    return value;
  }
  return null;
}
