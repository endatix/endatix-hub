import { useState, useEffect, useRef } from "react";
import type { Model } from "survey-core";
import { createLocalizedModel } from "@/lib/localization/create-localized-model";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { applyPersonalizationToModel } from "@/lib/personalization/apply-personalization";
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
  initializeLanguage?: (model: Model) => void;
  onModelCreated?: (model: Model) => void;
  formRuntime?: FormRuntimeContextValue;
}

export function useSurveyModel({
  formId,
  definition,
  customQuestions,
  initializeLanguage,
  submission,
  onModelCreated,
  formRuntime,
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

    void loadCustomQuestions();
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
    let active = true;
    let unbindQuestionLoops: (() => void) | undefined;
    void createLocalizedModel(definition)
      .then((model) => {
        if (!active) return;
        const initialSubmission = submissionRef.current;
        restoreSubmission(model, initialSubmission, setError);
        unbindQuestionLoops = bindQuestionLoops(model);
        initializeLanguage?.(model);
        onModelCreated?.(model);
        processSearchParams(model);
        applyPersonalizationToModel(model, initialSubmission?.personalization);
        setSurveyModel(model);
        isInitializedRef.current = true;
        cleanupUrl();
        formRuntime?.updateState({ surveyModel: model });
      })
      .catch(() => {
        if (active) setError("Failed to initialize survey");
      });

    return () => {
      active = false;
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
    initializeLanguage,
    initAnyAnsweredGlobals,
    initQuestionLoopsGlobals,
    bindQuestionLoops,
    formRuntime,
  ]);

  return {
    error,
    surveyModel,
  };
}

let isPublicSurveyRuntimeInitialized = false;

function restoreSubmission(
  model: Model,
  submission: Submission | undefined,
  onError: (message: string) => void,
) {
  if (!submission) return;
  setSubmissionData(model, submission.jsonData, onError);
  model.currentPageNo = submission.currentPage ?? 0;
  applyVariablesToModel(model, submission.metadata);
}

function initPublicSurveyRuntime(): void {
  if (isPublicSurveyRuntimeInitialized) {
    return;
  }

  registerAudioQuestion();
  addRandomizeGroupFeature();
  isPublicSurveyRuntimeInitialized = true;
}
