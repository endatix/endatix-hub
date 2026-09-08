import type { Route } from "next";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { EMBED_RESERVED_QUERY_PARAMS } from "@/features/embed-form/embed-query-params";
import { DynamicVariable } from "../types";
import { useSubmissionQueue } from "./submission-queue";
import { SubmissionData } from "@/features/submissions/types";
import { SurveyModel } from "survey-react-ui";

interface UseSearchParamsVarsOptions {
  removeAfterProcessing?: boolean;
  debugMode?: boolean;
}

const IGNORED_PARAMS = new Set([
  "token",
  "theme",
  "language",
  "lang",
  ...EMBED_RESERVED_QUERY_PARAMS,
]);

/** The params a public form treats as prefill: everything the app does not reserve. */
const pickPrefillParams = (
  searchParams: URLSearchParams,
): Record<string, DynamicVariable> => {
  const variables: Record<string, DynamicVariable> = {};

  searchParams.forEach((value, key) => {
    if (key.length > 0 && !IGNORED_PARAMS.has(key)) {
      variables[key] = value;
    }
  });

  return variables;
};

const applySearchParamsToModel = (
  model: SurveyModel,
  searchParams: URLSearchParams,
): {
  variables: Record<string, DynamicVariable>;
  hasChanges: boolean;
} => {
  const variables = pickPrefillParams(searchParams);
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    return { variables: {}, hasChanges: false };
  }

  let hasChanges = false;
  entries.forEach(([key, value]) => {
    hasChanges ||= value !== model.getVariable(key);
    model.setVariable(key, value);
  });

  return { variables, hasChanges };
};

/**
 * React hook that provides methods to process search parameters.
 * The hook does NOT automatically process params - it returns methods
 * that should be called manually by the orchestrator (e.g., useSurveyModel).
 *
 * @param formId - The form identifier.
 * @param options - Optional settings:
 *   - removeAfterProcessing: Remove params from URL after processing (default: false)
 *   - debugMode: Enable debug logging (default: false)
 *
 * @returns Object with:
 *   - processSearchParams: Function to apply params and handle side-effects (model state sync)
 *   - cleanupUrl: Function to remove params from URL (optional)
 */
export const useSearchParamsVariables = (
  formId: string,
  options?: UseSearchParamsVarsOptions,
) => {
  const { removeAfterProcessing = false, debugMode = false } = options ?? {};
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSubmission } = useSubmissionQueue(formId);
  const hasCleanedUpRef = useRef(false);

  const processSearchParams = useCallback(
    (
      model: SurveyModel,
      onSetVariables?: (vars: Record<string, DynamicVariable>) => void,
    ) => {
      const result = applySearchParamsToModel(model, searchParams);

      if (!result.hasChanges) {
        return;
      }

      onSetVariables?.(result.variables);

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

      if (debugMode) {
        console.log("Search params processed:", {
          originalParams: Object.fromEntries(searchParams.entries()),
          extractedVars: result.variables,
        });
      }
    },
    [searchParams, enqueueSubmission, debugMode],
  );

  const cleanupUrl = useCallback(() => {
    if (!removeAfterProcessing || debugMode || hasCleanedUpRef.current) {
      return;
    }

    const prefillKeys = Object.keys(pickPrefillParams(searchParams));
    if (prefillKeys.length === 0) {
      return;
    }

    const newSearchParams = new URLSearchParams(searchParams);
    prefillKeys.forEach((key) => newSearchParams.delete(key));

    const query = newSearchParams.toString();
    const newUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;

    router.replace(newUrl as Route, { scroll: false });
    hasCleanedUpRef.current = true;
  }, [searchParams, router, removeAfterProcessing, debugMode]);

  return { processSearchParams, cleanupUrl };
};
