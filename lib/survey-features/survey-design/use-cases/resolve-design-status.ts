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
 * The one status the design badge shows, highest priority first: a blocked save
 * (invalid JSON) outranks pending edits, which outrank save progress and success.
 */
export function resolveSurveyDesignStatus({
  hasJsonErrors,
  isOnJsonTab,
  isJsonModified,
  hasUnsavedChanges,
  isSaving = false,
  showSavedSuccess = false,
}: SurveyDesignStatusInput): SurveyDesignStatus {
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
