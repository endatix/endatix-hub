import { Result } from "@/lib/result";
import { SurveyModel, Helpers } from "survey-core";

/**
 * Merges the stored submission data into the model and returns true if it differs from the model's data.
 * Merge, not assign: assigning drops the values the form sets itself (defaultValueExpression) for keys the
 * stored data does not hold, and they never re-run. Stored values win.
 * @param model - The survey model to set the submission data to.
 * @param submissionData - The submission data to set to the model.
 * @param onError - [Optional] The callback to call if an error occurs.
 * @returns [Result<boolean>] A result indicating whether the data has changed.
 */
export function setSubmissionData(
  model: SurveyModel,
  submissionData: string,
  onError?: (error: string) => void,
): Result<boolean> {
  let hasChanges = false;
  if (!submissionData) {
    return Result.success(hasChanges);
  }

  if (!model) {
    const errorMessage = "Model is required";
    onError?.(errorMessage);
    return Result.error(errorMessage);
  }

  try {
    const parsedData = JSON.parse(submissionData);
    if (!Helpers.isTwoValueEquals(model.data, parsedData)) {
      model.mergeData(parsedData);
      hasChanges = true;
    }

    return Result.success(hasChanges);
  } catch {
    const errorMessage = "Failed to parse submission data";
    onError?.(errorMessage);
    return Result.error(errorMessage);
  }
}
