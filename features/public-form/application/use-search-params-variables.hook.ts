import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { DynamicVariable } from "../types";
import { useSubmissionQueue } from "./submission-queue";
import { SubmissionData } from "@/features/submissions/types";
import { SurveyModel } from "survey-react-ui";

interface UseSearchParamsVarsOptions {
  removeAfterProcessing?: boolean;
  debugMode?: boolean;
}

const IGNORED_PARAMS = new Set(["token", "theme", "language", "lang"]);
/**
 * React hook for processing search parameters as dynamic variables for a survey model.
 *
 * - Reads search params from the URL and sets them as variables on the SurveyModel.
 * - Optionally removes search params from the URL after processing.
 * - Optionally enables debug logging.
 * - Calls onSetVariables callback with the parsed variables.
 *
 * @param formId - The form identifier.
 * @param model - The SurveyModel instance to update.
 * @param onSetVariables - Optional callback invoked with the parsed variables.
 * @param options - Optional settings:
 *   - removeAfterProcessing: Remove params from URL after processing (default: true)
 *   - debugMode: Enable debug logging (default: false)
 *
 * Usage:
 *   useSearchParamsVariables(formId, model, onSetVariables, { removeAfterProcessing: false });
 */
export const useSearchParamsVariables = (
  formId: string,
  model: SurveyModel | null,
  onSetVariables?: (vars: Record<string, DynamicVariable>) => void,
  options?: UseSearchParamsVarsOptions,
) => {
  const { removeAfterProcessing = false, debugMode = false } = options ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSubmission } = useSubmissionQueue(formId);

  const processSearchParams = useCallback(() => {
    if (!model) {
      return;
    }

    const searchParamsVars: Record<string, DynamicVariable> = {};

    searchParams.forEach((value, key) => {
      if (key.length > 0 && !IGNORED_PARAMS.has(key)) {
        searchParamsVars[key] = value;
      }
    });

    if (Object.keys(searchParamsVars).length === 0) {
      return;
    }

    let hasNewOrModifiedVars = false;
    Object.entries(searchParamsVars).forEach(([key, value]) => {
      if (value !== model.getVariable(key)) {
        hasNewOrModifiedVars = true;
      }

      model.setVariable(key, value);
    });

    if (!hasNewOrModifiedVars) {
      return;
    }

    onSetVariables?.(searchParamsVars);

    const surveyVars: Record<string, DynamicVariable> = {};

    model.getVariableNames().forEach((name) => {
      surveyVars[name] = model.getVariable(name);
    });

    const submissionData: SubmissionData = {
      metadata: JSON.stringify({
        variables: surveyVars,
        language: model.locale,
      }),
    };
    enqueueSubmission(submissionData);

    if (removeAfterProcessing && !debugMode) {
      const newSearchParams = new URLSearchParams(searchParams);
      Object.keys(searchParamsVars).forEach((key) =>
        newSearchParams.delete(key),
      );

      const newUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(newUrl as any, { scroll: false });
    }

    // Debug logging
    if (debugMode) {
      console.log("Search params processed:", {
        originalParams: Object.fromEntries(searchParams.entries()),
        extractedVars: searchParamsVars,
        removedAfterProcessing: removeAfterProcessing && !debugMode,
      });
    }
  }, [
    model,
    searchParams,
    onSetVariables,
    enqueueSubmission,
    removeAfterProcessing,
    debugMode,
    router,
  ]);

  useEffect(() => {
    processSearchParams();
  }, [processSearchParams]);

  return { processSearchParams };
};
