"use client";

import { toast } from "@/components/ui/toast";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { Result } from "@/lib/result";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useEndatixSurveyTheme } from "@/lib/themes/use-endatix-themes";
import { useEffect, useRef, useState } from "react";
import { Model } from "survey-core";
import { getSubmissionLocale, isLocaleValid } from "@/lib/localization";

export function useSurveyModel(
  submission: Submission,
  customQuestions?: string[],
  readOnly: boolean = false,
  onModelCreated?: (model: Model) => void,
) {
  const cleanUpFuncRef = useRef<(() => void) | null>(null);
  const modelRef = useRef<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    initGlobals: initQuestionLoopsGlobals,
    bindToSurvey: bindQuestionLoops,
  } = useQuestionLoops();
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();

  const surveyTheme = useEndatixSurveyTheme();
  const surveyThemeRef = useRef(surveyTheme);
  surveyThemeRef.current = surveyTheme;

  useEffect(() => {
    const initializeModel = async () => {
      if (modelRef.current) {
        setIsLoading(false);
        return;
      }

      if (!submission.formDefinition?.jsonData) {
        return;
      }

      let questionsList: string[] = [];
      if (customQuestions) {
        questionsList = customQuestions;
      } else {
        const result = await getCustomQuestionsAction();

        if (result === undefined) {
          toast.error("Could not proceed with fetching custom questions");
          return;
        }

        if (Result.isSuccess(result)) {
          questionsList = result.value.map((q) => q.jsonData);
        }
      }

      try {
        if (questionsList.length > 0) {
          initializeCustomQuestions(questionsList);
        }

        initAnyAnsweredGlobals();
        initQuestionLoopsGlobals();
        const definitionJson = JSON.parse(submission.formDefinition.jsonData);
        const submissionData = JSON.parse(submission.jsonData);
        const model = new Model(definitionJson);
        const unbindQuestionLoops = bindQuestionLoops(model);

        onModelCreated?.(model);

        model.data = submissionData;

        const submissionLocale = getSubmissionLocale(submission);
        if (submissionLocale && isLocaleValid(submissionLocale, model)) {
          model.locale = submissionLocale;
        }

        model.showCompletedPage = false;
        model.validationEnabled = false;
        model.showPageTitles = true;
        model.showPageNumbers = false;
        model.showCompleteButton = false;
        model.readOnly = readOnly;
        model.showTOC = true;
        model.showQuestionNumbers = true;
        model.showProgressBar = "off" as const;
        model.showTitle = false;
        model.getAllPanels().forEach((panel) => {
          panel.expand();
        });

        model.applyTheme(surveyThemeRef.current);

        modelRef.current = model;

        cleanUpFuncRef.current = () => {
          unbindQuestionLoops?.();
          modelRef.current = null;
          cleanUpFuncRef.current = null;
        };
      } catch (error) {
        console.error("Error initializing survey model:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModel();

    return () => {
      cleanUpFuncRef.current?.();
      cleanUpFuncRef.current = null;
      modelRef.current = null;
    };
  }, [
    submission,
    customQuestions,
    readOnly,
    onModelCreated,
    initAnyAnsweredGlobals,
    initQuestionLoopsGlobals,
    bindQuestionLoops,
  ]);

  useEffect(() => {
    if (!modelRef.current) return;
    modelRef.current.applyTheme(surveyTheme);
  }, [surveyTheme]);

  return { model: modelRef.current, isLoading };
}
