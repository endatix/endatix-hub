import { useState, useEffect } from "react";
import {
  Model,
  SurveyModel,
} from "survey-core";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { useDynamicVariables } from "../application/use-dynamic-variables.hook";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { customQuestions as customQuestionsList } from "@/customizations/questions/question-registry";

export function useSurveyModel(
  definition: string,
  submission?: Submission,
  customQuestions?: string[],
) {
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const { setFromMetadata } = useDynamicVariables(surveyModel);

  // Load custom questions before creating survey model
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // Load built-in custom questions
        if (customQuestions?.length) {
          initializeCustomQuestions(customQuestions);
        }
        // Load dynamic questions from form metadata
        for (const questionName of customQuestionsList) {
          try {
            await questionLoaderModule.loadQuestion(questionName);
            console.debug(`✅ Loaded custom question: ${questionName}`);
          } catch (error) {
            console.warn(
              `⚠️ Failed to load custom question: ${questionName}`,
              error,
            );
          }
        }
      } catch (error) {
        console.error("Error loading questions:", error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [customQuestions]);

  useEffect(() => {
    let model: SurveyModel | undefined;
    if (definition && !isLoadingQuestions) {
      model = new SurveyModel(definition);
      setSurveyModel(model);
    } else if (!definition) {
      setSurveyModel(null);
    }
  }, [definition, isLoadingQuestions]);

  useEffect(() => {
    if (submission && surveyModel) {
      try {
        setFromMetadata(submission.metadata);
        surveyModel.data = JSON.parse(submission.jsonData);
        surveyModel.currentPageNo = submission.currentPage ?? 0;
      } catch (error) {
        console.debug("Failed to parse submission data", error);
        setError("Failed to parse submission data");
      }
    }
  }, [setFromMetadata, submission, surveyModel]);

  return {
    surveyModel,
    isLoading: !surveyModel || isLoadingQuestions,
    error,
  };
}
