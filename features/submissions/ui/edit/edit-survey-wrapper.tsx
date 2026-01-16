import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { Result } from "@/lib/result";
import { Submission } from "@/lib/endatix-api";
import { useEffect, useRef, useState } from "react";
import {
  DynamicPanelItemValueChangedEvent,
  MatrixCellValueChangedEvent,
  ValueChangedEvent,
} from "survey-core";
import "survey-core/survey-core.css";
import { SharpLightPanelless } from "survey-core/themes";
import { Model, Survey, SurveyModel } from "survey-react-ui";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { useDynamicVariables } from "@/features/public-form/application/use-dynamic-variables.hook";
import {
  getSubmissionLocale,
  isLocaleValid,
} from "../../submission-localization";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { toast } from "@/components/ui/toast";
import { useRichText } from "@/lib/survey-features/rich-text";
import "@/features/storage/use-cases/view-files/ui/protected-file-preview";
import { ReadTokensResult } from "@/features/storage";
import { useSurveyStorage } from "@/features/storage/use-cases/use-survey-storage.hook";

interface EditSurveyWrapperProps {
  submission: Submission;
  onChange: (
    sender: SurveyModel,
    event:
      | ValueChangedEvent
      | DynamicPanelItemValueChangedEvent
      | MatrixCellValueChangedEvent,
  ) => void;
  customQuestions?: string[];
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
}

registerAudioQuestion();
addRandomizeGroupFeature();

function useSurveyModel(submission: Submission, customQuestions?: string[]) {
  const modelRef = useRef<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        const model = new Model(json);

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

        modelRef.current = model;
      } catch (error) {
        console.error("Error initializing survey model:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeModel();
  }, [submission, customQuestions]);

  return { model: modelRef.current, isLoading };
}

function EditSurveyWrapper({
  submission,
  onChange,
  customQuestions,
  readTokenPromises,
}: Readonly<EditSurveyWrapperProps>) {
  const { model, isLoading } = useSurveyModel(submission, customQuestions);
  const { setFromMetadata } = useDynamicVariables(model);
  const [submissionId, setSubmissionId] = useState(submission.id);
  useRichText(model);

  const { registerStorageHandlers } = useSurveyStorage({
    model: model,
    formId: submission.formId,
    submissionId,
    onSubmissionIdChange: setSubmissionId,
    readTokenPromises,
  });

  useEffect(() => {
    if (!model) {
      return;
    }

    const unregisterStorage = registerStorageHandlers(model);
    setFromMetadata(submission.metadata);
    model.onValueChanged.add(onChange);
    model.onDynamicPanelValueChanged.add(onChange);
    model.onMatrixCellValueChanged.add(onChange);
    return () => {
      unregisterStorage();
      model.onValueChanged.remove(onChange);
      model.onDynamicPanelValueChanged.remove(onChange);
      model.onMatrixCellValueChanged.remove(onChange);
    };
  }, [
    model,
    onChange,
    setFromMetadata,
    submission.metadata,
    registerStorageHandlers,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return <div>Submission not found</div>;
  }

  return <Survey model={model} />;
}

export default EditSurveyWrapper;
