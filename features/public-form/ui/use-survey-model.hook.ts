import { useMemo, useEffect } from "react";
import { Model } from "survey-core";
import { Submission } from "@/types";
import { SpecializedVideo } from "@/lib/questions";
import { registerSpecializedQuestion } from "@/lib/questions";
import { KantarCheckbox } from "@/lib/questions/kantar-checkbox/kantar-checkbox-question";
import { KantarRadio } from "@/lib/questions/kantar-radio/kantar-radio-question";
import { KantarRanking } from "@/lib/questions/kantar-ranking/kantar-ranking-question";
import { customizeSurvey } from "@/lib/kantar/customize-survey";

registerSpecializedQuestion(SpecializedVideo);
registerSpecializedQuestion(KantarCheckbox);
registerSpecializedQuestion(KantarRadio);
registerSpecializedQuestion(KantarRanking);

export function useSurveyModel(definition: string, submission?: Submission) {
  // Create survey model only when definition changes
  const surveyModel = useMemo(() => {
    const model = new Model(definition);
    customizeSurvey(model);
    return model;
  }, [definition]);

  // Handle submission updates via effect
  useEffect(() => {
    if (submission) {
      try {
        surveyModel.data = JSON.parse(submission.jsonData);
        surveyModel.currentPageNo = submission.currentPage ?? 0;
      } catch (error) {
        console.debug("Failed to parse submission data", error);
      }
    }
  }, [submission, surveyModel]);

  return surveyModel;
}
