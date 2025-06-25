"use client";

import { useTrackEvent } from "@/features/analytics/posthog/client";
import {
  SubmissionData,
  submitFormAction,
} from "@/features/public-form/application/actions/submit-form.action";
import { useBlobStorage } from "@/features/storage/hooks/use-blob-storage";
import { Result } from "@/lib/result";
import { Submission } from "@/types";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CompleteEvent, SurveyModel } from "survey-core";
import "survey-core/survey-core.css";
import { Survey } from "survey-react-ui";
import { useSubmissionQueue } from "../application/submission-queue";
import { useSurveyModel } from "./use-survey-model.hook";
import { useSearchParamsVariables } from "../application/use-search-params-variables.hook";
import { useSurveyTheme } from './use-survey-theme.hook';

interface SurveyComponentProps {
  definition: string;
  formId: string;
  submission?: Submission;
  theme?: string;
  customQuestions?: string[];
}

export default function SurveyComponent({
  definition,
  formId,
  submission,
  theme,
  customQuestions,
}: SurveyComponentProps) {
  const { surveyModel } = useSurveyModel(
    definition,
    submission,
    customQuestions,
  );
  const { enqueueSubmission, clearQueue } = useSubmissionQueue(formId);
  const [isSubmitting, startSubmitting] = useTransition();
  const [submissionId, setSubmissionId] = useState<string>(
    submission?.id ?? "",
  );
  useSurveyTheme(theme, surveyModel);
  useSearchParamsVariables(formId, surveyModel);
  const { trackException } = useTrackEvent();

  useBlobStorage({
    formId,
    submissionId,
    surveyModel,
    onSubmissionIdChange: setSubmissionId,
  });

  useEffect(() => {
    if (submission?.id) {
      setSubmissionId(submission.id);
    }
  }, [submission?.id]);

  const updatePartial = useCallback(
    (sender: SurveyModel) => {
      const formData = JSON.stringify(sender.data, null, 3);
      const submissionData: SubmissionData = {
        isComplete: false,
        jsonData: formData,
        currentPage: sender.currentPageNo,
      };

      enqueueSubmission(submissionData);
    },
    [enqueueSubmission],
  );

  const submitForm = useCallback(
    (sender: SurveyModel, event: CompleteEvent) => {
      if (isSubmitting) {
        return;
      }

      clearQueue();
      event.showSaveInProgress();
      const formData = JSON.stringify(sender.data, null, 3);

      const submissionData: SubmissionData = {
        isComplete: true,
        jsonData: formData,
        currentPage: sender.currentPageNo ?? 0,
      };

      startSubmitting(async () => {
        const result = await submitFormAction(formId, submissionData);
        if (Result.isSuccess(result)) {
          event.showSaveSuccess("The results were saved successfully!");
        } else {
          event.showSaveError(
            "Failed to submit form. Please try again and contact us if the problem persists.",
          );
          trackException("Form submission failed", {
            form_id: formId,
            error_message: result.message,
          });
        }
      });
    },
    [formId, isSubmitting, clearQueue, startSubmitting, trackException],
  );

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    surveyModel.onComplete.add(submitForm);
    surveyModel.onValueChanged.add(updatePartial);
    surveyModel.onCurrentPageChanged.add(updatePartial);
    surveyModel.onDynamicPanelValueChanged.add(updatePartial);
    surveyModel.onMatrixCellValueChanged.add(updatePartial);

    return () => {
      surveyModel.onComplete.remove(submitForm);
      surveyModel.onValueChanged.remove(updatePartial);
      surveyModel.onCurrentPageChanged.remove(updatePartial);
      surveyModel.onDynamicPanelValueChanged.remove(updatePartial);
      surveyModel.onMatrixCellValueChanged.remove(updatePartial);
    };
  }, [surveyModel, submitForm, updatePartial]);

  if (!surveyModel) {
    return <div>Loading...</div>;
  }

  return <Survey model={surveyModel} />;
}
