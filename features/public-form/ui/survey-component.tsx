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

  useEffect(() => {
    if (!isFillMode || !isModelReady || !surveyModel) {
      return;
    }

    // The iframe's outer height chain is fully under our control, but the
    // surrounding host page's own layout wrappers (e.g. AppProvider's
    // sidebar shell) are shared with non-embed routes and aren't guaranteed
    // to propagate height down to us. Paint the canvas directly instead of
    // depending on that chain: html/body backgrounds fill the full iframe
    // viewport regardless of their own box height (CSS canvas painting),
    // so this reaches the space beyond the survey's own content even if
    // some ancestor's box stays content-sized.
    //
    // SurveyJS v3 no longer exposes the page/surface color as a plain CSS
    // custom property we can read off `themeVariables` and apply via inline
    // style: it injects its own `:where(.sd-theme-root)` stylesheet instead,
    // which wins the cascade over anything set on our wrapper regardless of
    // which --sjs*/--sjs2* variable name we guess (this is what silently
    // broke when v2's --sjs-general-backcolor-dim stopped applying here
    // under v3). The color itself still exists, just on a pseudo-element
    // (.sd-root-modern::before) that isn't readable via getPropertyValue on
    // any real element — so ask the browser for its resolved color
    // directly instead of trying to replicate SurveyJS's own variable
    // resolution, which is what keeps changing across versions.
    const isPaintedColor = (value: string) =>
      Boolean(value) && value !== "transparent" && value !== "rgba(0, 0, 0, 0)";

    const paintFillBackground = () => {
      const card = shellRef.current?.querySelector(".sd-root-modern");
      const pseudoBackground = card
        ? getComputedStyle(card, "::before").backgroundColor
        : "";
      const themeVariables = surveyModel.themeVariables ?? {};
      const backgroundColor = isPaintedColor(pseudoBackground)
        ? pseudoBackground
        : themeVariables["--sjs-general-backcolor-dim"] ||
          themeVariables["--sjs-general-backcolor"] ||
          DEFAULT_FILL_BACKGROUND_COLOR;

      document.documentElement.style.backgroundColor = backgroundColor;
      document.body.style.backgroundColor = backgroundColor;
    };

    const previousHtmlBackground =
      document.documentElement.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;

    // Paint immediately — verified live that by the time isModelReady
    // flips, useSurveyTheme's own effect has already applied the real
    // theme's stylesheet in every case tried, including a stored
    // (non-default) theme. But this component's effect ordering relative
    // to a third-party library's internal rendering isn't a contract
    // either side promises, so don't rely on that alone for something
    // this version-sensitive — re-paint once SurveyJS itself confirms the
    // survey (and, transitively, its theme) has fully rendered. This also
    // covers a theme changing later via `appliedTheme` in the deps below.
    paintFillBackground();
    surveyModel.onAfterRenderSurvey.add(paintFillBackground);

    // Restore whatever was there before on unmount, on a fill-to-auto
    // transition, or before re-applying a changed theme's color — this
    // mutates document/body, which outlives this component, so it
    // shouldn't leave a stale override behind for whatever renders next.
    return () => {
      surveyModel.onAfterRenderSurvey.remove(paintFillBackground);
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.backgroundColor = previousBodyBackground;
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
