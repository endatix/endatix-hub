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
import { useSurveyTheme } from "./use-survey-theme";
import { useDynamicVariables } from "../application/use-dynamic-variables.hook";

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
  const model = useSurveyModel(definition, submission, customQuestions);
  const { enqueueSubmission, clearQueue } = useSubmissionQueue(formId);
  const [isSubmitting, startSubmitting] = useTransition();
  const [submissionId, setSubmissionId] = useState<string>(
    submission?.id ?? "",
  );
  useSurveyTheme(theme, model);
  const { variables } = useDynamicVariables(model, formId);
  const { trackException } = useTrackEvent();

  useBlobStorage({
    formId,
    submissionId,
    surveyModel: model,
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
    model.onComplete.add(submitForm);
    model.onValueChanged.add(updatePartial);
    model.onCurrentPageChanged.add(updatePartial);
    model.onDynamicPanelValueChanged.add(updatePartial);
    model.onMatrixCellValueChanged.add(updatePartial);

    return () => {
      model.onComplete.remove(submitForm);
      model.onValueChanged.remove(updatePartial);
      model.onCurrentPageChanged.remove(updatePartial);
      model.onDynamicPanelValueChanged.remove(updatePartial);
      model.onMatrixCellValueChanged.remove(updatePartial);
    };
  }, [model, submitForm, updatePartial]);

  return (
    <>
      <Survey model={model} />
      <pre>{JSON.stringify(variables, null, 2)}</pre>
    </>
  );
}
