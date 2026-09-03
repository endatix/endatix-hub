import { JsonEditorBaseModel } from "survey-creator-core";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";

export interface JsonEditorState {
  hasErrors: boolean;
  isOnJsonTab: boolean;
  isJsonModified: boolean;
}

export const JSON_CHANGED_TYPE = "JSON_EDITOR";

export const JSON_EDITOR_PLUGIN_NAME = SURVEY_CREATOR_BUILT_IN_TAB.json;

export const JSON_EDITOR_PROPERTY_NAMES = {
  hasErrors: "hasErrors",
  aceCanUndo: "aceCanUndo",
} as const;

/** State when the user is not on the JSON tab. */
export const NOT_ON_JSON_TAB_STATE: JsonEditorState = {
  hasErrors: false,
  isOnJsonTab: false,
  isJsonModified: false,
};

/**
 * Builds state for "on JSON tab" with optional overrides.
 */
export function createOnJsonTabState(
  overrides: Partial<JsonEditorState>,
): JsonEditorState {
  return {
    hasErrors: false,
    isOnJsonTab: true,
    isJsonModified: false,
    ...overrides,
  };
}

/** Extends the TabJsonEditorBasePlugin with an aceEditor property. */
export type AceJsonPlugin = JsonEditorBaseModel & {
  aceEditor: any;
};
