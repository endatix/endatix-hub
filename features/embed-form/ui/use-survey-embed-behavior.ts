"use client";

import { SurveyModel } from "survey-core";
import { useCallback, useRef } from "react";
import { isSafeRedirectUrl } from "@/lib/utils/url-utils";
import { EmbedMessageType } from "../types";

export interface UseSurveyEmbedBehaviorOptions {
  isEmbed: boolean;
  formId: string;
}

interface EmbedHookResult {
  /**
   * Registers the embed handlers for the survey model.
   * @param model - The survey model.
   * @returns A function to unregister the embed handlers.
   */
  registerEmbedHandlers: (model: SurveyModel) => () => void;
  /**
   * Sends a message to the parent window to notify the embed form that an event has occurred.
   * @param type - The type of event to send.
   * @param data - The data to send with the event.
   */
  sendEmbedMessage: (
    type: EmbedMessageType,
    data?: Record<string, unknown>,
  ) => void;
}

/**
 * Hook to handle embed behavior for survey forms.
 * @param isEmbed - Whether the form is embedded.
 * @param formId - The ID of the form.
 * @returns An object with the registerEmbedHandlers and sendEmbedMessage functions.
 */
export function useSurveyEmbedBehavior({
  isEmbed,
  formId,
}: UseSurveyEmbedBehaviorOptions): EmbedHookResult {
  const pageNavigationOccurred = useRef(false);

  /**
   * Sends a message to the parent window to notify the embed form that an event has occurred.
   * @param type - The type of event to send.
   * @param data - The data to send with the event.
   */
  const sendEmbedMessage = useCallback(
    (type: EmbedMessageType, data?: Record<string, unknown>) => {
      if (
        isEmbed &&
        globalThis.window !== undefined &&
        window.parent !== globalThis.window
      ) {
        window.parent.postMessage(
          {
            type: `endatix:${type}`,
            formId,
            ...data,
          },
          "*",
        );
      }
    },
    [isEmbed, formId],
  );

  /**
   * Registers the embed handlers for the survey model.
   * @param model - The survey model.
   * @returns A function to unregister the embed handlers.
   */
  const registerEmbedHandlers = useCallback(
    (model: SurveyModel) => {
      if (!isEmbed || !model) {
        return () => {};
      }

      const handleAfterRenderSurvey = () => {
        sendEmbedMessage("form-loaded");
      };

      const handlePageChanged = () => {
        pageNavigationOccurred.current = true;
      };

      const handlePageRendered = () => {
        if (pageNavigationOccurred.current) {
          pageNavigationOccurred.current = false;
          sendEmbedMessage("scroll");
        }
      };

      const handleNavigateToUrl = (
        sender: SurveyModel,
        options: { url: string; allow: boolean },
      ) => {
        if (!options?.url) return;

        // Prevent SurveyJS redirect within the iframe - https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#onNavigateToUrl
        options.allow = false;

        if (isSafeRedirectUrl(options.url)) {
          sendEmbedMessage("navigate", { url: options.url });
        } else {
          console.warn(
            "Endatix Embed: Blocked unsafe navigation URL",
            options.url,
          );
        }
      };

      model.onAfterRenderSurvey.add(handleAfterRenderSurvey);
      model.onCurrentPageChanged.add(handlePageChanged);
      model.onAfterRenderPage.add(handlePageRendered);
      model.onNavigateToUrl.add(handleNavigateToUrl);

      return () => {
        model.onAfterRenderSurvey.remove(handleAfterRenderSurvey);
        model.onCurrentPageChanged.remove(handlePageChanged);
        model.onAfterRenderPage.remove(handlePageRendered);
        model.onNavigateToUrl.remove(handleNavigateToUrl);
      };
    },
    [isEmbed, sendEmbedMessage],
  );

  return { registerEmbedHandlers, sendEmbedMessage };
}
