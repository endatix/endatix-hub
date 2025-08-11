import { useBlobStorage } from "@/features/storage/hooks/use-blob-storage";
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
import { useSubmissionDetailsViewOptions } from "../details/submission-details-view-options-context";
import { surveyLocalization } from "survey-core";

interface EditSurveyWrapperProps {
  submission: Submission;
  onChange: (
    sender: SurveyModel,
    event:
      | ValueChangedEvent
      | DynamicPanelItemValueChangedEvent
      | MatrixCellValueChangedEvent,
  ) => void;
}

function useSurveyModel(submission: Submission) {
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

      try {
        const result = await getCustomQuestionsAction();
        if (Result.isSuccess(result)) {
          initializeCustomQuestions(result.value.map((q) => q.jsonData));
        }

        const json = JSON.parse(submission.formDefinition.jsonData);
        const submissionData = JSON.parse(submission.jsonData);
        const model = new Model(json);

        model.data = submissionData;
        // If a language was used when the submission was created, display in that language
        try {
          if (submission.metadata) {
            const parsed = JSON.parse(submission.metadata) as {
              language?: string;
            };
            if (parsed.language && typeof parsed.language === "string") {
              model.locale = parsed.language;
            }
          }
        } catch {
          // ignore
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
  }, [submission]);

  return { model: modelRef.current, isLoading };
}

function EditSurveyWrapper({ submission, onChange }: EditSurveyWrapperProps) {
  const { model, isLoading } = useSurveyModel(submission);
  const { setFromMetadata } = useDynamicVariables(model);
  const { options } = useSubmissionDetailsViewOptions();

  useBlobStorage({
    formId: submission.formId,
    submissionId: submission.id,
    surveyModel: model,
  });

  useEffect(() => {
    if (!model) {
      return;
    }

    setFromMetadata(submission.metadata);
    // Respect view option for language selection
    try {
      if (options.useSubmissionLanguage) {
        // language already applied in model initialization
      } else {
        model.locale = surveyLocalization.defaultLocale;
      }
    } catch {}
    model.onValueChanged.add(onChange);
    model.onDynamicPanelValueChanged.add(onChange);
    model.onMatrixCellValueChanged.add(onChange);
    return () => {
      model.onValueChanged.remove(onChange);
      model.onDynamicPanelValueChanged.remove(onChange);
      model.onMatrixCellValueChanged.remove(onChange);
    };
  }, [model, onChange, setFromMetadata, submission.metadata]);

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
