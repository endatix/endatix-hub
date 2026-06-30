import { useState, useEffect, useRef } from "react";
import { Model, SurveyModel } from "survey-core";
import { Submission } from "@/lib/endatix-api";
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
import { useRegexMatch } from "@/lib/survey-features/regex-match";
import { FormRuntimeContextValue } from "@/lib/form-runtime/form-runtime.context";

interface UseSurveyModelProps {
  formId: string;
  definition: string;
  submission?: Submission;
  customQuestions?: string[];
  onModelCreated?: (model: Model) => void;
  formRuntime?: FormRuntimeContextValue;
}

export function useSurveyModel({
  formId,
  definition,
  customQuestions,
  submission,
  onModelCreated,
  formRuntime,
}: UseSurveyModelProps) {
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const { processSearchParams, cleanupUrl } = useSearchParamsVariables(formId);
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();
  const { initGlobals: initRegexMatchGlobals } = useRegexMatch();
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
    initRegexMatchGlobals();
    initQuestionLoopsGlobals();
    const model = new SurveyModel(definition);

    const initialSubmission = submissionRef.current;
    if (initialSubmission) {
      setSubmissionData(model, initialSubmission.jsonData, (error) => {
        setError(error);
      });
      model.currentPageNo = initialSubmission.currentPage ?? 0;
      applyVariablesToModel(model, initialSubmission.metadata);
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
    initRegexMatchGlobals,
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

function initPublicSurveyRuntime(): void {
  if (isPublicSurveyRuntimeInitialized) {
    return;
  }

  registerAudioQuestion();
  addRandomizeGroupFeature();
  isPublicSurveyRuntimeInitialized = true;
}
