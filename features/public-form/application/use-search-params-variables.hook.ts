import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { DynamicVariable } from "../types";
import { useSubmissionQueue } from "./submission-queue";
import { SubmissionData } from "./actions/submit-form.action";
import { SurveyModel } from "survey-react-ui";

interface UseSearchParamsVarsOptions {
  removeAfterProcessing?: boolean;
  debugMode?: boolean;
}

export const useSearchParamsVariables = (
  formId: string,
  model: SurveyModel | null,
  onSetVariables?: (vars: Record<string, DynamicVariable>) => void,
  options?: UseSearchParamsVarsOptions,
) => {
  const { removeAfterProcessing = true, debugMode = false } = options ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSubmission } = useSubmissionQueue(formId);

  const processSearchParams = useCallback(() => {
    if (!model) {
      return;
    }

    const searchParamsVars: Record<string, DynamicVariable> = {};
    searchParams.forEach((value, key) => {
      searchParamsVars[key] = value;
    });

    if (searchParamsVars.length === 0) {
      return;
    }

    Object.entries(searchParamsVars).forEach(([key, value]) => {
      model.setVariable(key, value);
    });

    onSetVariables?.(searchParamsVars);

    const surveyVars: Record<string, DynamicVariable> = {};
    model.getVariableNames().forEach((name) => {
      surveyVars[name] = model.getVariable(name);
    });

    const submissionData: SubmissionData = {
      metadata: JSON.stringify({ variables: surveyVars }),
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

      router.replace(newUrl, { scroll: false });
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
    searchParams,
    onSetVariables,
    model,
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
