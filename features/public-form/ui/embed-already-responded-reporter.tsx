"use client";

import { getEmbedMessagingContext } from "@/features/embed-form/ui/embed-messaging-context";
import { useEffect, useRef } from "react";

interface EmbedAlreadyRespondedReporterProps {
  formId: string;
  message: string;
}

export function EmbedAlreadyRespondedReporter({
  formId,
  message,
}: EmbedAlreadyRespondedReporterProps) {
  const hasReported = useRef(false);

  useEffect(() => {
    if (hasReported.current) {
      return;
    }

    const messagingContext = getEmbedMessagingContext();
    debugger
    if (
      !messagingContext.parentOrigin ||
      globalThis.window.parent === globalThis.window
    ) {
      return;
    }

    hasReported.current = true;
    globalThis.window.parent.postMessage(
      {
        type: "endatix:form-error",
        embedId: messagingContext.embedId,
        formId,
        success: false,
        error: {
          type: "access",
          code: "already_responded",
          message,
        },
      },
      messagingContext.parentOrigin,
    );
  }, [formId, message]);

  return null;
}
