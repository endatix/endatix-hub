/**
 * Pure status logic for SurveyDesignStatusBadge. No React, no DOM.
 * Used by the badge component and by tests.
 */

export enum SurveyDesignStatus {
  NoChanges = "NoChanges",
  InvalidJson = "InvalidJson",
  SaveInProgress = "SaveInProgress",
  Saved = "Saved",
  JsonModified = "JsonChanges",
  UnsavedChanges = "UnsavedChanges",
}

export interface SurveyDesignStatusInput {
  hasJsonErrors: boolean;
  isOnJsonTab: boolean;
  isJsonModified: boolean;
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
  showSavedSuccess?: boolean;
}

/**
 * Resolves which status badge to show. Priority order:
 * 1. Invalid JSON (block save)
 * 2. JSON modified (on JSON tab)
 * 3. Unsaved changes (not on JSON tab)
 * 4. Save in progress
 * 5. Saved success
 * 6. No changes
 */
export function getSurveyDesignStatus(
  input: SurveyDesignStatusInput,
): SurveyDesignStatus {
  const {
    hasJsonErrors,
    isOnJsonTab,
    isJsonModified,
    hasUnsavedChanges,
    isSaving = false,
    showSavedSuccess = false,
  } = input;

  if (hasJsonErrors) {
    return SurveyDesignStatus.InvalidJson;
  }

  if (isJsonModified && isOnJsonTab) {
    return SurveyDesignStatus.JsonModified;
  }

  if (hasUnsavedChanges) {
    return SurveyDesignStatus.UnsavedChanges;
  }

  if (isSaving) {
    return SurveyDesignStatus.SaveInProgress;
  }

  if (showSavedSuccess) {
    return SurveyDesignStatus.Saved;
  }

  return SurveyDesignStatus.NoChanges;
}
