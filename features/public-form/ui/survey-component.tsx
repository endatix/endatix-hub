"use client";

import { useTrackEvent } from "@/features/analytics/posthog/client";
import { useStorageWithSurvey } from '@/features/asset-storage/client';
import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { getReCaptchaToken } from "@/features/recaptcha/infrastructure/recaptcha-client";
import { recaptchaConfig } from "@/features/recaptcha/recaptcha-config";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult, Submission } from "@/lib/endatix-api";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTable } from "@/lib/survey-features/summary-table";
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
import "survey-core/survey.i18n";
import { Survey } from "survey-react-ui";
import { useSubmissionQueue } from "../application/submission-queue";
import { useSearchParamsVariables } from "../application/use-search-params-variables.hook";
import { LanguageSelector } from "./language-selector";
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
}: SurveyComponentProps) {
  const { surveyModel } = useSurveyModel(
    definition,
    submission,
    customQuestions,
  );
  const { enqueueSubmission, clearQueue } = useSubmissionQueue(
    formId,
    urlToken,
  );
  const [isSubmitting, startSubmitting] = useTransition();
  const [submissionId, setSubmissionId] = useState<string>(
    submission?.id ?? "",
  );
  useSurveyTheme(theme, surveyModel);
  useRichText(surveyModel);
  useLoopAwareSummaryTable(surveyModel);
  useQuestionLoops(surveyModel);
  useSearchParamsVariables(formId, surveyModel);
  const { trackException } = useTrackEvent();
  const submissionUpdateGuard = useRef<boolean>(false);

  const { registerStorageHandlers, isStorageReady } = useStorageWithSurvey({
    model: surveyModel,
    formId,
    submissionId,
    onSubmissionIdChange: setSubmissionId,
  });

  const isModelReady = surveyModel && isStorageReady;

  useEffect(() => {
    if (submission?.id) {
      setSubmissionId(submission.id);
    }
  }, [submission?.id]);

  const sendEmbedMessage = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (
        isEmbed &&
        globalThis.window !== undefined &&
        window.parent !== globalThis.window
      ) {
        window.parent.postMessage(
          {
            type: `endatix-${type}`,
            formId,
            ...data,
          },
          "*",
        );
      }
    },
    [isEmbed, formId],
  );

  useEffect(() => {
    if (surveyModel && isEmbed) {
      sendEmbedMessage("form-loaded");
    }
  }, [surveyModel, isEmbed, sendEmbedMessage]);

  const pageNavigationOccurred = useRef(false);

  useEffect(() => {
    if (!surveyModel || !isEmbed) {
      return;
    }

    const handlePageChanged = () => {
      pageNavigationOccurred.current = true;
    };

    const handlePageRendered = () => {
      if (pageNavigationOccurred.current) {
        pageNavigationOccurred.current = false;
        sendEmbedMessage("scroll");
      }
    };

    surveyModel.onCurrentPageChanged.add(handlePageChanged);
    surveyModel.onAfterRenderPage.add(handlePageRendered);

    return () => {
      surveyModel.onCurrentPageChanged.remove(handlePageChanged);
      surveyModel.onAfterRenderPage.remove(handlePageRendered);
    };
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

        const result = await submitFormAction(formId, submissionData, urlToken);
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
      urlToken,
    ],
  );

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const unregisterStorage = registerStorageHandlers(surveyModel);
    surveyModel.onComplete.add(submitForm);
    surveyModel.onValueChanged.add(updatePartial);
    surveyModel.onCurrentPageChanged.add(updatePartial);
    surveyModel.onDynamicPanelValueChanged.add(updatePartial);
    surveyModel.onMatrixCellValueChanged.add(updatePartial);

    return () => {
      unregisterStorage();
      surveyModel.onComplete.remove(submitForm);
      surveyModel.onValueChanged.remove(updatePartial);
      surveyModel.onCurrentPageChanged.remove(updatePartial);
      surveyModel.onDynamicPanelValueChanged.remove(updatePartial);
      surveyModel.onMatrixCellValueChanged.remove(updatePartial);
    };
  }, [surveyModel, submitForm, updatePartial, registerStorageHandlers]);

  if (!isModelReady) {
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
