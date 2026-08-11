import { useState, useEffect, useRef } from "react";
import { Model, SurveyModel } from "survey-core";
import { Submission } from "@/lib/endatix-api";
import { resolveSurveyModelLocaleForSubmission } from "@/lib/localization";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { applyVariablesToModel } from "../application/use-dynamic-variables.hook";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { customQuestions as customQuestionsList } from "@/customizations/questions/question-registry";
import { useSearchParamsVariables } from "../application/use-search-params-variables.hook";
import { setSubmissionData } from "@/lib/survey-features";
import { useInitOnly } from "@/lib/utils/hooks";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { FormRuntimeContextValue } from "@/lib/form-runtime/form-runtime.context";

interface UseSurveyModelProps {
  formId: string;
  definition: string;
  submission?: Submission;
  customQuestions?: string[];
  onModelCreated?: (model: Model) => void;
  formRuntime?: FormRuntimeContextValue;
  /**
   * When set (submission details), drives `model.locale` from submission
   * metadata vs catalog default. Omit on public-form runtime.
   */
  useSubmissionLanguage?: boolean;
}

export function useSurveyModel({
  formId,
  definition,
  customQuestions,
  submission,
  onModelCreated,
  formRuntime,
  useSubmissionLanguage,
}: UseSurveyModelProps) {
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const { processSearchParams, cleanupUrl } = useSearchParamsVariables(formId);
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();
  const {
    initGlobals: initQuestionLoopsGlobals,
    bindToSurvey: bindQuestionLoops,
  } = useQuestionLoops();
  const isInitializedRef = useRef(false);
  const identityRef = useRef<string | null>(null);
  const submissionRef = useInitOnly(submission);
  const useSubmissionLanguageRef = useRef(useSubmissionLanguage);
  useSubmissionLanguageRef.current = useSubmissionLanguage;

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
    const identity = `${formId}:${definition}`;
    if (identityRef.current !== identity) {
      identityRef.current = identity;
      isInitializedRef.current = false;
    }

    const shouldSkipInitialization =
      !definition || isLoadingQuestions || isInitializedRef.current;

    if (shouldSkipInitialization) {
      return;
    }

    initPublicSurveyRuntime();
    initAnyAnsweredGlobals();
    initQuestionLoopsGlobals();
    const model = new SurveyModel(definition);

    const initialSubmission = submissionRef.current;
    if (initialSubmission) {
      setSubmissionData(model, initialSubmission.jsonData, (error) => {
        setError(error);
      });
      model.currentPageNo = initialSubmission.currentPage ?? 0;
      applyVariablesToModel(model, initialSubmission.metadata);

      if (useSubmissionLanguageRef.current !== undefined) {
        model.locale = resolveSurveyModelLocaleForSubmission(
          initialSubmission,
          model,
          useSubmissionLanguageRef.current === true,
        );
      }
    }

    const unbindQuestionLoops = bindQuestionLoops(model);
    onModelCreated?.(model);
    processSearchParams(model);

    setSurveyModel(model);
    isInitializedRef.current = true;

    cleanupUrl();

    if (formRuntime) {
      formRuntime.updateState({ surveyModel: model });
    }

    return () => {
      unbindQuestionLoops?.();
    };
  }, [
    formId,
    definition,
    isLoadingQuestions,
    processSearchParams,
    cleanupUrl,
    submissionRef,
    onModelCreated,
    initAnyAnsweredGlobals,
    initQuestionLoopsGlobals,
    bindQuestionLoops,
    formRuntime,
  ]);

  // Keep locale in sync when View → submission language is toggled after construction.
  useEffect(() => {
    if (!surveyModel || !submission || useSubmissionLanguage === undefined) {
      return;
    }

    surveyModel.locale = resolveSurveyModelLocaleForSubmission(
      submission,
      surveyModel,
      useSubmissionLanguage === true,
    );
  }, [surveyModel, submission, useSubmissionLanguage]);

  return {
    error,
    surveyModel,
  };
}

let isPublicSurveyRuntimeInitialized = false;

function initPublicSurveyRuntime(): void {
  if (isPublicSurveyRuntimeInitialized) {
    return;
  }

  registerAudioQuestion();
  addRandomizeGroupFeature();
  isPublicSurveyRuntimeInitialized = true;
}
