"use client";

import { useStorageWithSurvey } from "@/features/asset-storage/client";
import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
// Deep import, not the feature barrel: the barrel re-exports the Creator
// bindings, which this read-only surface has no use for.
import { registerDragCategorizeQuestion } from "@/lib/questions/drag-categorize/drag-categorize.component";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTable } from "@/lib/survey-features/summary-table";
import type { Model } from "survey-core";
import { useCallback, useEffect } from "react";
import {
  DynamicPanelItemValueChangedEvent,
  MatrixCellValueChangedEvent,
  ValueChangedEvent,
} from "survey-core";
import "survey-core/survey-core.css";
import { Survey, SurveyModel } from "survey-react-ui";
import { useSurveyModel } from "./use-survey-model.hook";

registerAudioQuestion();
// This surface does not run the extension loader, so the question type is
// registered directly.
registerDragCategorizeQuestion();
addRandomizeGroupFeature();

interface SubmissionSurveyProps {
  submission: Submission;
  customQuestions?: string[];
  readOnly?: boolean;
  onModelCreated?: (model: Model) => void;
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
  onModelCreated,
  onChange,
}: Readonly<SubmissionSurveyProps>) {
  const { model, isLoading } = useSurveyModel(
    submission,
    customQuestions,
    readOnly,
    onModelCreated,
  );
  const getSubmissionId = useCallback(() => {
    return submission.id;
  }, [submission.id]);

  const { registerStorageHandlers, isStorageReady } = useStorageWithSurvey({
    model: model,
    formId: submission.formId,
    getSubmissionId,
  });
  useRichText(model);
  useLoopAwareSummaryTable(model);

  useEffect(() => {
    if (!model) {
      return;
    }

    const unregisterStorage = registerStorageHandlers(model);

    // Only register onChange handlers if NOT readOnly AND onChange is provided
    // This ensures read-only has a higher priority, even if onChange is passed
    if (!readOnly && onChange) {
      model.onValueChanged.add(onChange);
      model.onDynamicPanelValueChanged.add(onChange);
      model.onMatrixCellValueChanged.add(onChange);

      return () => {
        unregisterStorage();
        model.onValueChanged.remove(onChange);
        model.onDynamicPanelValueChanged.remove(onChange);
        model.onMatrixCellValueChanged.remove(onChange);
      };
    }
  }, [model, onChange, submission.metadata, readOnly, registerStorageHandlers]);

  if (isLoading || !isStorageReady) {
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
