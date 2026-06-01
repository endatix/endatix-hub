"use client";

import { getEmbedMessagingContext } from "@/features/embed-form/ui/embed-messaging-context";
import { isEmbedHeightReportingFrozen } from "@/features/embed-form/ui/embed-height-reporting";
import { useEffect, useRef } from "react";

export function EmbedHeightReporter() {
  const lastReportedHeight = useRef(0);

  useEffect(() => {
    function reportHeight() {
      if (isEmbedHeightReportingFrozen()) {
        return;
      }

      const messagingContext = getEmbedMessagingContext();
      if (
        !messagingContext.parentOrigin ||
        globalThis.window.parent === globalThis.window
      ) {
        return;
      }

      const height = document.body.scrollHeight;
      if (height !== lastReportedHeight.current) {
        window.parent.postMessage(
          {
            type: "endatix:resize",
            embedId: messagingContext.embedId,
            height: height,
          },
          messagingContext.parentOrigin,
        );
        lastReportedHeight.current = height;
      }
    }

    reportHeight();

    window.addEventListener("resize", reportHeight);

    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver(reportHeight);
    observer.observe(document.body, config);

    return () => {
      window.removeEventListener("resize", reportHeight);
      observer.disconnect();
    };
  }, []);

  return null;
}
