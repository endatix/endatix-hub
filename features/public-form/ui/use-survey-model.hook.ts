import { useState, useEffect } from "react";
import { Model } from "survey-core";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { useDynamicVariables } from "../application/use-dynamic-variables.hook";

export function useSurveyModel(
  definition: string,
  submission?: Submission,
  customQuestions?: string[],
) {
  if (customQuestions?.length) {
    initializeCustomQuestions(customQuestions);
  }

  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const { setFromMetadata } = useDynamicVariables(surveyModel);

  useEffect(() => {
    if (definition) {
      setSurveyModel(new Model(definition));
    } else {
      setSurveyModel(null);
    }
  }, [definition]);

  useEffect(() => {
    if (submission && surveyModel) {
      try {
        surveyModel.data = JSON.parse(submission.jsonData);
        surveyModel.currentPageNo = submission.currentPage ?? 0;
        setFromMetadata(submission.metadata);
      } catch (error) {
        console.debug("Failed to parse submission data", error);
        setError("Failed to parse submission data");
      }
    }
  }, [setFromMetadata, submission, surveyModel]);

  return {
    surveyModel,
    isLoading: !surveyModel,
    error,
  };
}
