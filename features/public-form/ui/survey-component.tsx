"use client";

import { useTrackEvent } from "@/features/analytics/posthog/client";
import { useStorageWithSurvey } from "@/features/asset-storage/client";
import { useSurveyEmbedBehavior } from "@/features/embed-form";
import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { getReCaptchaToken } from "@/features/recaptcha/infrastructure/recaptcha-client";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult, Submission } from "@/lib/endatix-api";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTable } from "@/lib/survey-features/summary-table";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";
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
  Model,
  SurveyModel,
  ValueChangedEvent,
} from "survey-core";
import "survey-core/survey-core.css";
import "survey-core/survey.i18n";
import { Survey } from "survey-react-ui";
import { useSubmissionQueue } from "../application/submission-queue";
import { LanguageSelector } from "./language-selector";
import styles from "./survey-component.module.css";
import { useSurveyModel } from "./use-survey-model.hook";
import { useSurveyTheme } from "./use-survey-theme.hook";

interface SurveyComponentProps {
  definition: string;
  formId: string;
  submission?: Submission;
  theme?: string;
  customQuestions?: string[];
  requiresReCaptcha?: boolean;
  isEmbed?: boolean;
  urlToken?: string;
  onModelCreated?: (model: Model) => void;
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
  urlToken,
  onModelCreated,
}: SurveyComponentProps) {
  const formRuntime = useFormRuntime();
  const { stateRef, updateState } = formRuntime;

  const { surveyModel } = useSurveyModel({
    formId,
    definition,
    submission,
    customQuestions,
    onModelCreated,
    formRuntime,
  });
  const { enqueueSubmission, clearQueue } = useSubmissionQueue(
    formId,
    urlToken,
  );
  const [isSubmitting, startSubmitting] = useTransition();
  useSurveyTheme(theme, surveyModel);
  useRichText(surveyModel);
  useLoopAwareSummaryTable(surveyModel);
  const { trackException } = useTrackEvent();
  const submissionUpdateGuard = useRef<boolean>(false);

  const getSubmissionId = useCallback(() => {
    return stateRef.current.submissionId;
  }, [stateRef]);
  const handleSubmissionIdChange = useCallback(
    (id: string) => {
      updateState({ submissionId: id });
    },
    [updateState],
  );

  const { registerStorageHandlers, isStorageReady } = useStorageWithSurvey({
    model: surveyModel,
    formId,
    getSubmissionId,
    onSubmissionIdChange: handleSubmissionIdChange,
  });

  const isModelReady = surveyModel && isStorageReady;

  const { sendEmbedMessage, registerEmbedHandlers } = useSurveyEmbedBehavior({
    isEmbed: isEmbed ?? false,
    formId,
  });

  useEffect(() => {
    if (submission?.id) {
      updateState({ submissionId: submission.id });
    }
  }, [submission?.id, updateState]);

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

        const result = await submitFormAction(formId, submissionData, urlToken);
        if (ApiResult.isSuccess(result)) {
          updateState({ submissionId: result.data.submissionId });
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
      updateState,
      clearQueue,
      startSubmitting,
      trackException,
      requiresReCaptcha,
      sendEmbedMessage,
      surveyLocales.length,
      urlToken,
    ],
  );

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const unregisterStorage = registerStorageHandlers(surveyModel);
    const unregisterEmbed = registerEmbedHandlers(surveyModel);
    surveyModel.onComplete.add(submitForm);
    surveyModel.onValueChanged.add(updatePartial);
    surveyModel.onCurrentPageChanged.add(updatePartial);
    surveyModel.onDynamicPanelValueChanged.add(updatePartial);
    surveyModel.onMatrixCellValueChanged.add(updatePartial);

    return () => {
      unregisterStorage();
      unregisterEmbed();
      surveyModel.onComplete.remove(submitForm);
      surveyModel.onValueChanged.remove(updatePartial);
      surveyModel.onCurrentPageChanged.remove(updatePartial);
      surveyModel.onDynamicPanelValueChanged.remove(updatePartial);
      surveyModel.onMatrixCellValueChanged.remove(updatePartial);
    };
  }, [
    surveyModel,
    submitForm,
    updatePartial,
    registerStorageHandlers,
    registerEmbedHandlers,
  ]);

  if (!isModelReady) {
    return <div>Loading...</div>;
  }

  return (
    <div className={isEmbed ? undefined : styles.layoutFullHeight}>
      <LanguageSelector
        availableLocales={surveyLocales}
        surveyModel={surveyModel}
      />
      <Survey model={surveyModel} />
    </div>
  );
}
