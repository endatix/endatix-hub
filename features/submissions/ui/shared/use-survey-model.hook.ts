import { toast } from "@/components/ui/toast";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { Submission } from "@/lib/endatix-api";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { Result } from "@/lib/result";
import { Model } from "survey-core";
import { useEffect, useRef, useState } from "react";
import { SharpLightPanelless } from "survey-core/themes";
import {
  getSubmissionLocale,
  isLocaleValid,
} from "../../submission-localization";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";

export function useSurveyModel(
  submission: Submission,
  customQuestions?: string[],
  readOnly: boolean = false,
  onModelCreated?: (model: Model) => void,
) {
  const cleanUpFuncRef = useRef<(() => void) | null>(null);
  const modelRef = useRef<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { bindToSurvey: bindQuestionLoops } = useQuestionLoops();

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

        const json = JSON.parse(submission.formDefinition.jsonData);
        const submissionData = JSON.parse(submission.jsonData);
        const model = new Model();
        const unbindQuestionLoops = bindQuestionLoops(model);

        model.JSON = json;
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
        model.questionsOnPageMode = "singlePage";
        model.showCompleteButton = false;
        model.navigationMode = "singlePage" as const;
        model.showProgressBar = "off" as const;
        model.showTitle = false;
        model.getAllPanels().forEach((panel) => {
          panel.expand();
        });

        model.applyTheme(SharpLightPanelless);

        if (readOnly) {
          model.mode = "display";
        }

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

    const cleanup = initializeModel();

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
    bindQuestionLoops,
  ]);

  return { model: modelRef.current, isLoading };
}
