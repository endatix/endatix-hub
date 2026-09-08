"use client";

import { getEmbedMessagingContext } from "@/features/embed-form/ui/embed-messaging-context";
import { embedHeightReporting } from "@/features/embed-form/ui/embed-height-reporting";
import { useEffect, useRef } from "react";

export function EmbedHeightReporter() {
  const lastReportedHeight = useRef(0);

  useEffect(() => {
    function reportHeight() {
      const messagingContext = getEmbedMessagingContext();
      if (embedHeightReporting.isFrozen()) {
        return;
      }

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

    // The complete page is laid out while reporting is frozen, so re-measure once
    // the freeze lifts. The frame gives the pending render time to land; any later
    // mutation is picked up by the observer as usual.
    const unsubscribeResume = embedHeightReporting.onResume(() => {
      requestAnimationFrame(reportHeight);
    });

    return () => {
      window.removeEventListener("resize", reportHeight);
      observer.disconnect();
      unsubscribeResume();
    };
  }, []);

  return null;
}
