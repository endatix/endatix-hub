"use client";

import { useDynamicVariables } from "@/features/public-form/application/use-dynamic-variables.hook";
import { useBlobStorage } from "@/features/storage/hooks/use-blob-storage";
import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useEffect } from "react";
import {
  DynamicPanelItemValueChangedEvent,
  MatrixCellValueChangedEvent,
  ValueChangedEvent,
} from "survey-core";
import "survey-core/survey-core.css";
import { Survey, SurveyModel } from "survey-react-ui";
import { useSurveyModel } from "./use-survey-model.hook";

registerAudioQuestion();
addRandomizeGroupFeature();

interface SubmissionSurveyProps {
  submission: Submission;
  customQuestions?: string[];
  readOnly?: boolean;
  onChange?: (
    sender: SurveyModel,
    event:
      | ValueChangedEvent
      | DynamicPanelItemValueChangedEvent
      | MatrixCellValueChangedEvent,
  ) => void;
}

function SubmissionSurvey({
  submission,
  customQuestions,
  readOnly = false,
  onChange,
}: SubmissionSurveyProps) {
  const { model, isLoading } = useSurveyModel(submission, customQuestions, readOnly);
  const { setFromMetadata } = useDynamicVariables(model);
  useRichText(model);

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

    // Only register onChange handlers if NOT readOnly AND onChange is provided
    // This ensures read-only has a higher priority, even if onChange is passed
    if (!readOnly && onChange) {
      model.onValueChanged.add(onChange);
      model.onDynamicPanelValueChanged.add(onChange);
      model.onMatrixCellValueChanged.add(onChange);

      return () => {
        model.onValueChanged.remove(onChange);
        model.onDynamicPanelValueChanged.remove(onChange);
        model.onMatrixCellValueChanged.remove(onChange);
      };
    }
  }, [model, onChange, setFromMetadata, submission.metadata, readOnly]);

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

export default SubmissionSurvey;
