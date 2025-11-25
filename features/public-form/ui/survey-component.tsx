"use client";

import { useTrackEvent } from "@/features/analytics/posthog/client";
import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { useBlobStorage } from "@/features/storage/hooks/use-blob-storage";
import { ApiResult, Submission } from "@/lib/endatix-api";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CompleteEvent,
  CurrentPageChangedEvent,
  DynamicPanelItemValueChangedEvent,
  MatrixCellValueChangedEvent,
  SurveyModel,
  ValueChangedEvent,
} from "survey-core";
import "survey-core/survey-core.css";
import { Survey } from "survey-react-ui";
import { useSubmissionQueue } from "../application/submission-queue";
import { useSurveyModel } from "./use-survey-model.hook";
import { useSearchParamsVariables } from "../application/use-search-params-variables.hook";
import { useSurveyTheme } from "./use-survey-theme.hook";
import { getReCaptchaToken } from "@/features/recaptcha/infrastructure/recaptcha-client";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { SubmissionData } from "@/features/submissions/types";
import { LanguageSelector } from "./language-selector";
import "survey-core/survey.i18n";
import { useRichText } from "@/lib/survey-features/rich-text";

interface SurveyComponentProps {
  definition: string;
  formId: string;
  submission?: Submission;
  theme?: string;
  customQuestions?: string[];
  requiresReCaptcha?: boolean;
  isEmbed?: boolean;
}

type PartialUpdateEvent =
  | ValueChangedEvent
  | CurrentPageChangedEvent
  | DynamicPanelItemValueChangedEvent
  | MatrixCellValueChangedEvent;

export default function SurveyComponent({
  definition,
  formId,
  submission,
  theme,
  customQuestions,
  requiresReCaptcha,
  isEmbed = false,
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
  useRichText(surveyModel);
  useSearchParamsVariables(formId, surveyModel);
  const { trackException } = useTrackEvent();
  const submissionUpdateGuard = useRef<boolean>(false);

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

  const sendEmbedMessage = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (isEmbed && typeof window !== "undefined" && window.parent !== window) {
        window.parent.postMessage(
          {
            type: `endatix-${type}`,
            formId,
            ...data,
          },
          "*"
        );
      }
    },
    [isEmbed, formId]
  );

  useEffect(() => {
    if (surveyModel && isEmbed) {
      sendEmbedMessage("form-loaded");
    }
  }, [surveyModel, isEmbed, sendEmbedMessage]);

  const surveyLocales = useMemo(() => {
    return surveyModel?.getUsedLocales() ?? [];
  }, [surveyModel]);

  const updatePartial = useCallback(
    (sender: SurveyModel, event: PartialUpdateEvent) => {
      if (submissionUpdateGuard.current) {
        console.debug(
          "Submission update guard is on, skipping update. Event: ",
          event,
        );
        return;
      }

      const formData = JSON.stringify(sender.data, null, 3);
      const submissionData: SubmissionData = {
        isComplete: false,
        jsonData: formData,
        currentPage: sender.currentPageNo,
      };

      if (surveyLocales.length > 1) {
        submissionData.metadata = JSON.stringify({ language: sender.locale });
      }

      enqueueSubmission(submissionData);
    },
    [enqueueSubmission, surveyLocales.length],
  );

  const submitForm = useCallback(
    (sender: SurveyModel, event: CompleteEvent) => {
      if (isSubmitting || submissionUpdateGuard.current) {
        return;
      }


      // Set guard flag to prevent multiple submissions
      submissionUpdateGuard.current = true;

      clearQueue();
      sender.showCompletePage = true;
      event.showSaveInProgress("Saving your answers...");
      const formData = JSON.stringify(sender.data, null, 3);

      const submissionData: SubmissionData = {
        isComplete: true,
        jsonData: formData,
        currentPage: sender.currentPageNo ?? 0,
      };

      if (surveyLocales.length > 1) {
        submissionData.metadata = JSON.stringify({ language: sender.locale });
      }

      startSubmitting(async () => {
        if (recaptchaConfig.isReCaptchaEnabled() && requiresReCaptcha) {
          const reCaptchaToken = await getReCaptchaToken(
            recaptchaConfig.ACTIONS.SUBMIT_FORM,
          );
          submissionData.reCaptchaToken = reCaptchaToken;
        }

        const result = await submitFormAction(formId, submissionData);
        if (ApiResult.isSuccess(result)) {
          event.showSaveSuccess("The results were saved successfully!");
          sendEmbedMessage("form-complete", {
            submissionId: result.data.submissionId,
            success: true,
          });
        } else {
          submissionUpdateGuard.current = false;
          event.showSaveError(
            result.error.message ??
              "Failed to submit form. Please try again and contact us if the problem persists.",
          );
          trackException("Form submission failed", {
            form_id: formId,
            error_message: result.error.message,
          });
          sendEmbedMessage("form-error", {
            error: result.error.message,
            success: false,
          });
        }
      });
    },
    [
      formId,
      isSubmitting,
      clearQueue,
      startSubmitting,
      trackException,
      requiresReCaptcha,
      sendEmbedMessage,
      surveyLocales.length,
    ],
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

  return (
    <>
      <LanguageSelector
        availableLocales={surveyLocales}
        surveyModel={surveyModel}
      />
      <Survey model={surveyModel} />
    </>
  );
}
