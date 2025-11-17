import { useEffect } from "react";
import { SurveyModel } from "survey-core";
import { registerMarkdownRenderer } from "./register-markdown-renderer";

/**
 * Hook to register the markdown renderer for the survey model.
 * @param surveyModel - The survey model to register the markdown renderer for.
 * @returns void
 */
export function useRichText(surveyModel: SurveyModel | null) {
  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const view = registerMarkdownRenderer(surveyModel);
    return () => {
      view?.();
    };
  }, [surveyModel]);
}
