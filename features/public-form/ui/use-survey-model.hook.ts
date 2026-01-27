import { useState, useEffect, useRef } from "react";
import { Model, SurveyModel } from "survey-core";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import {
  useDynamicVariables,
  applyVariablesToModel,
} from "../application/use-dynamic-variables.hook";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { customQuestions as customQuestionsList } from "@/customizations/questions/question-registry";
import { useSearchParamsVariables } from "../application/use-search-params-variables.hook";
import { setSubmissionData } from "@/lib/survey-features";

interface UseSurveyModelProps {
  formId: string;
  definition: string;
  submission?: Submission;
  customQuestions?: string[];
}

/**
 * React hook that provides a survey model and related functionality.
 * @param formId - The form identifier.
 * @param definition - The survey definition.
 * @param submission - The submission data.
 * @param customQuestions - The custom questions.
 * @returns The survey model and related functionality.
 */
export function useSurveyModel({
  formId,
  definition,
  submission,
  customQuestions,
}: UseSurveyModelProps) {
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const { variables } = useDynamicVariables(surveyModel);
  const { processSearchParams, cleanupUrl } = useSearchParamsVariables(formId);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const loadCustomQuestions = async () => {
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

    loadCustomQuestions();
  }, [customQuestions]);

  useEffect(() => {
    const shouldSkipInitialization =
      !definition || isLoadingQuestions || isInitializedRef.current;

    if (shouldSkipInitialization) {
      return;
    }

    const model = new SurveyModel(definition);

    if (submission) {
      setSubmissionData(model, submission.jsonData, (error) => {
        setError(error);
      });
      model.currentPageNo = submission.currentPage ?? 0;
      applyVariablesToModel(model, submission.metadata);
    }
    processSearchParams(model);

    setSurveyModel(model);
    isInitializedRef.current = true;

    cleanupUrl();

    return () => {
      isInitializedRef.current = false;
    };
  }, [
    definition,
    isLoadingQuestions,
    submission,
    processSearchParams,
    cleanupUrl,
  ]);

  return {
    surveyModel,
    variables,
    isLoading: !surveyModel || isLoadingQuestions,
    error,
  };
}
