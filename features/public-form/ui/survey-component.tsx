"use client";

import { useTrackEvent } from "@/features/analytics/posthog/client";
import { useStorageWithSurvey } from "@/features/asset-storage/client";
import {
  freezeEmbedHeightReporting,
  isEmbedHeightReportingFrozen,
  resumeEmbedHeightReporting,
  useSurveyEmbedBehavior,
} from "@/features/embed-form";
import type { EmbedFormInfo } from "@/features/embed-form/types";
import type { SubmissionOperation } from "@/features/public-form/application/submit-form-operation";
import { submitPublicForm } from "@/features/public-form/application/submit-public-form";
import { getReCaptchaToken } from "@/features/recaptcha/infrastructure/recaptcha-client";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult, Submission } from "@/lib/endatix-api";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTable } from "@/lib/survey-features/summary-table";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
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
import { TestSubmissionBadge } from "./test-submission-badge";
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
  isRespondentTestMode?: boolean;
  embedForm?: EmbedFormInfo;
  onModelCreated?: (model: Model) => void;
  onSubmitSuccess?: (result: SubmissionOperation) => void;
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
  isRespondentTestMode,
  embedForm,
  onModelCreated,
  onSubmitSuccess,
}: SurveyComponentProps) {
  const formRuntime = useFormRuntime();
  const { stateRef, updateState } = formRuntime;
  const runtimeToken = stateRef.current.token;

  const { error: surveyModelError, surveyModel } = useSurveyModel({
    formId,
    definition,
    submission,
    customQuestions,
    onModelCreated,
    formRuntime,
  });
  const { enqueueSubmission, clearQueue } = useSubmissionQueue(
    formId,
    runtimeToken,
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
    embedForm,
  });
  useEffect(() => {
    if (submission?.id) {
      updateState({ submissionId: submission.id });
    }
  }, [submission?.id, updateState]);

  const surveyLocales = useMemo(() => {
    return surveyModel?.getUsedLocales() ?? [];
  }, [surveyModel]);

  const trackPartialChange = useCallback(
    (sender: SurveyModel, _event: PartialUpdateEvent) => {
      if (submissionUpdateGuard.current) {
        return;
      }

      if (isEmbed && isEmbedHeightReportingFrozen()) {
        resumeEmbedHeightReporting();
      }

      enqueueSubmission(
        buildSubmissionData(sender, false, surveyLocales.length > 1),
      );
    },
    [enqueueSubmission, isEmbed, surveyLocales.length],
  );

  const submitForm = useCallback(
    (sender: SurveyModel, event: CompleteEvent) => {
      if (isSubmitting || submissionUpdateGuard.current) {
        return;
      }

      // Set guard flag to prevent multiple submissions
      submissionUpdateGuard.current = true;

      clearQueue();
      if (isEmbed) {
        freezeEmbedHeightReporting();
      }

      sender.showCompletePage = true;
      event.showSaveInProgress("Saving your answers...");
      const submissionData = buildSubmissionData(
        sender,
        true,
        surveyLocales.length > 1,
      );

      startSubmitting(async () => {
        if (recaptchaConfig.isReCaptchaEnabled() && requiresReCaptcha) {
          const reCaptchaToken = await getReCaptchaToken(
            recaptchaConfig.ACTIONS.SUBMIT_FORM,
          );
          submissionData.reCaptchaToken = reCaptchaToken;
        }

        const result = await submitPublicForm(
          formId,
          submissionData,
          runtimeToken,
        );
        if (ApiResult.isSuccess(result)) {
          updateState({ submissionId: result.data.submissionId });
          onSubmitSuccess?.(result.data);
          event.showSaveSuccess("The results were saved successfully!");
          sendEmbedMessage("form-complete", {
            submissionId: result.data.submissionId,
            success: true,
            isComplete: result.data.isComplete,
            status: result.data.status,
            completedAt: result.data.completedAt,
          });
        } else {
          submissionUpdateGuard.current = false;
          if (isEmbed) {
            freezeEmbedHeightReporting();
          }

          event.showSaveError(
            result.error.message ??
              "Failed to submit form. Please try again and contact us if the problem persists.",
          );
          trackException("Form submission failed", {
            form_id: formId,
            error_message: result.error.message,
          });
          sendEmbedMessage("form-error", {
            success: false,
            error: {
              type: result.error.type,
              code: result.error.errorCode,
              message: result.error.message,
            },
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
      onSubmitSuccess,
      surveyLocales.length,
      runtimeToken,
      isEmbed,
    ],
  );

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const unregisterStorage = registerStorageHandlers(surveyModel);
    const unregisterEmbed = registerEmbedHandlers(surveyModel);
    surveyModel.onComplete.add(submitForm);
    surveyModel.onValueChanged.add(trackPartialChange);
    surveyModel.onCurrentPageChanged.add(trackPartialChange);
    surveyModel.onDynamicPanelValueChanged.add(trackPartialChange);
    surveyModel.onMatrixCellValueChanged.add(trackPartialChange);

    return () => {
      unregisterStorage();
      unregisterEmbed();
      surveyModel.onComplete.remove(submitForm);
      surveyModel.onValueChanged.remove(trackPartialChange);
      surveyModel.onCurrentPageChanged.remove(trackPartialChange);
      surveyModel.onDynamicPanelValueChanged.remove(trackPartialChange);
      surveyModel.onMatrixCellValueChanged.remove(trackPartialChange);
    };
  }, [
    surveyModel,
    submitForm,
    trackPartialChange,
    registerStorageHandlers,
    registerEmbedHandlers,
  ]);

  if (surveyModelError) {
    return <div role="alert">{surveyModelError}</div>;
  }

  if (!isModelReady) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className={isEmbed ? styles.embedShell : styles.layoutFullHeight}
      style={surveyModel.themeVariables}
    >
      {isRespondentTestMode && <TestSubmissionBadge />}
      <LanguageSelector
        availableLocales={surveyLocales}
        surveyModel={surveyModel}
      />
      <Survey model={surveyModel} />
    </div>
  );
}

function buildSubmissionData(
  sender: SurveyModel,
  isComplete: boolean,
  includeLanguage: boolean,
): SubmissionData {
  const submissionData: SubmissionData = {
    isComplete,
    jsonData: JSON.stringify(sender.data, null, 3),
    currentPage: sender.currentPageNo ?? 0,
  };

  if (includeLanguage) {
    submissionData.metadata = JSON.stringify({ language: sender.locale });
  }

  return submissionData;
}
