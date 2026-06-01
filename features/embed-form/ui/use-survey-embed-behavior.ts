"use client";

import { SurveyModel } from "survey-core";
import { useCallback, useRef } from "react";
import { isSafeRedirectUrl } from "@/lib/utils/url-utils";
import { EmbedFormInfo, EmbedMessagePayload, EmbedMessageType } from "../types";
import { getEmbedMessagingContext } from "./embed-messaging-context";
import { freezeEmbedHeightReporting } from "./embed-height-reporting";

export interface UseSurveyEmbedBehaviorOptions {
  isEmbed: boolean;
  formId: string;
  embedForm?: EmbedFormInfo;
}

type EmbedMessageData<T extends EmbedMessageType> = Omit<
  EmbedMessagePayload<T>,
  "formId"
>;

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
  sendEmbedMessage: <T extends EmbedMessageType>(
    type: T,
    data?: EmbedMessageData<T>,
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
  embedForm,
}: UseSurveyEmbedBehaviorOptions): EmbedHookResult {
  const pageNavigationOccurred = useRef(false);
  const messageFormId = embedForm?.formId ?? formId;

  /**
   * Sends a message to the parent window to notify the embed form that an event has occurred.
   * @param type - The type of event to send.
   * @param data - The data to send with the event.
   */
  const sendEmbedMessage = useCallback(
    <T extends EmbedMessageType>(type: T, data?: EmbedMessageData<T>) => {
      if (isEmbed && (type === "form-complete" || type === "form-error")) {
        freezeEmbedHeightReporting();
      }

      const messagingContext = getEmbedMessagingContext();

      if (isEmbed && (type === "form-complete" || type === "form-error")) {
        embedHeightReporting.freeze();
      }

      if (
        isEmbed &&
        globalThis.window !== undefined &&
        globalThis.window.parent !== globalThis.window &&
        messagingContext.parentOrigin
      ) {
        globalThis.window.parent.postMessage(
          {
            type: `endatix:${type}`,
            embedId: messagingContext.embedId,
            formId: messageFormId,
            ...data,
          },
          messagingContext.parentOrigin,
        );
      }
    },
    [isEmbed, messageFormId],
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
        if (!embedForm) {
          return;
        }

        sendEmbedMessage("form-loaded", {
          definitionId: embedForm.definitionId,
          limitOnePerUser: embedForm.limitOnePerUser,
          requiresReCaptcha: embedForm.requiresReCaptcha,
          metadata: embedForm.metadata,
          title:
            typeof model.title === "string" && model.title.trim().length > 0
              ? model.title
              : undefined,
        });
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
    [embedForm, isEmbed, sendEmbedMessage],
  );

  return { registerEmbedHandlers, sendEmbedMessage };
}
