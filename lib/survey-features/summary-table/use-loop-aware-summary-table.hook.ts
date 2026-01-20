import { useEffect } from "react";
import { SurveyModel } from "survey-core";
import { registerLoopAwareSummaryTable } from "./register-loop-aware-summary-table";

/**
 * Hook to register the markdown renderer for the survey model.
 * @param surveyModel - The survey model to register the markdown renderer for.
 * @returns void
 */
export function useLoopAwareSummaryTable(surveyModel: SurveyModel | null) {
  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const view = registerLoopAwareSummaryTable(surveyModel);
    return () => {
      view?.();
    };
  }, [surveyModel]);
}