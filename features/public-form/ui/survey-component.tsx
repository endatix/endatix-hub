"use client";

import { useTrackEvent } from "@/features/analytics/posthog/client";
import { useStorageWithSurvey } from "@/features/asset-storage/client";
import {
  embedHeightReporting,
  useSurveyEmbedBehavior,
} from "@/features/embed-form";
import { DEFAULT_FILL_BACKGROUND_COLOR } from "@/features/embed-form/height-mode";
import { getEmbedMessagingContext } from "@/features/embed-form/ui/embed-messaging-context";
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  type CSSProperties,
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
  const { enqueueSubmission, clearQueue, waitForInFlightPartial } =
    useSubmissionQueue(formId, runtimeToken);
  const [isSubmitting, startSubmitting] = useTransition();
  const { theme: appliedTheme } = useSurveyTheme(theme, surveyModel);
  useRichText(surveyModel);
  useLoopAwareSummaryTable(surveyModel);
  const { trackException } = useTrackEvent();
  const submissionUpdateGuard = useRef<boolean>(false);
  const originalCompletedHtmlRef = useRef<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // SurveyComponent is only ever loaded client-side (see
  // dynamic(..., { ssr: false }) in survey-js-wrapper.tsx), so there's no
  // server-rendered output to mismatch — safe to read synchronously instead
  // of via useEffect+state. Require embedId too: embed.js always sets it
  // alongside heightMode=fill, so a bare `?heightMode=fill` visit (not
  // driven by our own SDK) doesn't trigger fill styling.
  const embedMessagingContext = isEmbed
    ? getEmbedMessagingContext()
    : undefined;
  const isFillMode = Boolean(
    embedMessagingContext?.heightMode === "fill" &&
    embedMessagingContext?.embedId,
  );

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

  // Fill mode paints html/body directly: their backgrounds cover the full
  // iframe viewport regardless of their own box height (unlike a normal
  // element's), which is what reaches the space below the survey's own
  // (possibly shorter) content. Restoring the pre-fill-mode colors is a
  // separate effect, keyed only on isFillMode, so it fires on entering/
  // leaving fill mode — not on every re-paint from the effect below.
  useEffect(() => {
    if (!isFillMode) {
      return;
    }

    const previousHtmlBackground =
      document.documentElement.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundColor = previousBodyBackground;
    };
  }, [isFillMode]);

  useEffect(() => {
    if (!isFillMode || !isModelReady || !surveyModel) {
      return;
    }

    // SurveyJS v3 paints the survey's surface color via its own injected
    // `:where(.sd-theme-root)` stylesheet onto `.sd-root-modern::before`,
    // not via a themeVariables custom property we can read and reapply —
    // guessing a --sjs*/--sjs2* variable name is what silently broke here
    // under v3 (h930). Ask the browser for the resolved color instead.
    // Until that's painted, use the same DEFAULT_FILL_BACKGROUND_COLOR the
    // CSS fallback already shows (survey-component.module.css), rather
    // than a second, version-sensitive guess.
    const paintFillBackground = () => {
      const card = shellRef.current?.querySelector(".sd-root-modern");
      const pseudoBackground = card
        ? getComputedStyle(card, "::before").backgroundColor
        : "";
      const isPainted =
        Boolean(pseudoBackground) &&
        pseudoBackground !== "transparent" &&
        pseudoBackground !== "rgba(0, 0, 0, 0)";
      const backgroundColor = isPainted
        ? pseudoBackground
        : DEFAULT_FILL_BACKGROUND_COLOR;

      document.documentElement.style.backgroundColor = backgroundColor;
      document.body.style.backgroundColor = backgroundColor;
    };

    // Paint immediately, and again on SurveyJS's own onAfterRenderSurvey:
    // by the time isModelReady flips, useSurveyTheme has already applied
    // in every case tried, but that ordering isn't a contract either side
    // promises — the second paint is the safety net for when it isn't,
    // and also covers a theme changing later via `appliedTheme` below.
    paintFillBackground();
    surveyModel.onAfterRenderSurvey.add(paintFillBackground);

    return () => {
      surveyModel.onAfterRenderSurvey.remove(paintFillBackground);
    };
  }, [isFillMode, isModelReady, surveyModel, appliedTheme]);

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

      if (isEmbed && embedHeightReporting.isFrozen()) {
        embedHeightReporting.resume();
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
        embedHeightReporting.freeze();
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

        await waitForInFlightPartial();

        const result = await submitPublicForm(
          formId,
          submissionData,
          runtimeToken,
        );
        if (ApiResult.isSuccess(result)) {
          if (originalCompletedHtmlRef.current !== null) {
            sender.completedHtml = originalCompletedHtmlRef.current;
            originalCompletedHtmlRef.current = null;
          }
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
            embedHeightReporting.freeze();
          }

          // Keep showCompletePage true — SurveyJS renders showSaveError on the
          // complete page. Hiding it leaves a blank screen (surveyjs#4865).
          // Swap thank-you copy for a failure title; detail stays in the red banner.
          if (originalCompletedHtmlRef.current === null) {
            originalCompletedHtmlRef.current = sender.completedHtml ?? "";
          }
          sender.completedHtml = SUBMIT_FAILURE_COMPLETED_HTML;
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
      waitForInFlightPartial,
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

  const shellClassName = isEmbed
    ? `${styles.embedShell}${isFillMode ? ` ${styles.embedShellFill}` : ""}`
    : styles.layoutFullHeight;

  return (
    <div
      ref={shellRef}
      className={shellClassName}
      style={
        {
          ...surveyModel.themeVariables,
          ...(isFillMode
            ? { "--embed-fill-fallback-bg": DEFAULT_FILL_BACKGROUND_COLOR }
            : {}),
        } as CSSProperties
      }
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

const SUBMIT_FAILURE_COMPLETED_HTML = "<h3>Failed to submit your form</h3>";
