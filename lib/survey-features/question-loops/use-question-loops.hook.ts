import { useEffect } from "react";
import { SurveyModel } from "survey-core";
import { registerDynamicLooping } from "./register-dynamic-looping";

/**
 * Hook to register dynamic looping for the survey model.
 * @param surveyModel - The survey model to register the markdown renderer for.
 * @returns void
 */
export function useQuestionLoops(surveyModel: SurveyModel | null) {
  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const view = registerDynamicLooping(surveyModel);
    return () => {
      view?.();
    };
  }, [surveyModel]);
}
