/**
 * Pure state logic for the JSON editor. No React, no Survey Creator.
 * Used by useJsonEditor and by tests.
 */

export interface JsonEditorState {
  hasErrors: boolean;
  isOnJsonTab: boolean;
  isJsonModified: boolean;
}

export const JSON_EDITOR_PLUGIN_NAME = "json" as const;

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

export interface PropertyChangeInput {
  propertyName: string;
  newValue: unknown;
  hasErrorsFromModel: boolean;
  isJsonModifiedCurrent: boolean;
  isJsonTextDifferent: boolean;
  fileJustImported: boolean;
}

/**
 * Computes the next state after a model property change. Pure and testable.
 * Returns null when nothing relevant changed (no need to notify).
 */
export function computeStateAfterPropertyChange(
  input: PropertyChangeInput,
): JsonEditorState | null {
  const {
    propertyName,
    newValue,
    hasErrorsFromModel,
    isJsonModifiedCurrent,
    isJsonTextDifferent,
    fileJustImported,
  } = input;

  let hasErrors = hasErrorsFromModel;
  let isJsonModifiedNew;

  if (propertyName === JSON_EDITOR_PROPERTY_NAMES.hasErrors) {
    hasErrors = !!newValue;
  }

  if (isJsonModifiedCurrent !== isJsonTextDifferent) {
    isJsonModifiedNew = isJsonTextDifferent;
  }

  if (fileJustImported && !isJsonModifiedCurrent) {
    isJsonModifiedNew = true;
  }

  const shouldNotify =
    propertyName === JSON_EDITOR_PROPERTY_NAMES.hasErrors ||
    isJsonModifiedNew !== isJsonModifiedCurrent;

  if (!shouldNotify) {
    return null;
  }

  return createOnJsonTabState({ hasErrors, isJsonModified: isJsonModifiedNew });
}
