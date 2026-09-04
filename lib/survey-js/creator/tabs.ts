/**
 * Survey Creator types `activeTab` as `string`. These are the ids Hub relies on:
 * the vendor built-ins, plus the tabs Hub registers as Creator plugins.
 */
export const SURVEY_CREATOR_BUILT_IN_TAB = {
  designer: "designer",
  preview: "preview",
  theme: "theme",
  json: "json",
  translation: "translation",
  logic: "logic",
} as const;

export const ENDATIX_CREATOR_TAB = {
  ...SURVEY_CREATOR_BUILT_IN_TAB,
  diagnostics: "form-diagnostics",
} as const;

export type EndatixCreatorTabId =
  (typeof ENDATIX_CREATOR_TAB)[keyof typeof ENDATIX_CREATOR_TAB];

export const DEFAULT_CREATOR_TAB: EndatixCreatorTabId =
  ENDATIX_CREATOR_TAB.designer;

const TAB_IDS = new Set<string>(Object.values(ENDATIX_CREATOR_TAB));

/** Creator still emits `test` for Preview and `editor` for JSON. */
const LEGACY_TAB_IDS: Record<string, EndatixCreatorTabId> = {
  test: ENDATIX_CREATOR_TAB.preview,
  editor: ENDATIX_CREATOR_TAB.json,
};

export function canonicalizeCreatorTabId(
  value: string,
): EndatixCreatorTabId | null {
  if (TAB_IDS.has(value)) {
    return value as EndatixCreatorTabId;
  }
  return LEGACY_TAB_IDS[value] ?? null;
}
