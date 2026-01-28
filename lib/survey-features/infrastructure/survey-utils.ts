import { Result } from "@/lib/result";
import { SurveyModel, Helpers } from "survey-core";

/**
 * Sets the submission data to the model and returns true if the data has changed.
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
      model.data = parsedData;
      hasChanges = true;
    }

    return Result.success(hasChanges);
  } catch {
    const errorMessage = "Failed to parse submission data";
    onError?.(errorMessage);
    return Result.error(errorMessage);
  }
}
