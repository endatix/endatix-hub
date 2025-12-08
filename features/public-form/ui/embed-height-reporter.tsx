"use client";

import { useEffect, useRef } from "react";

export function EmbedHeightReporter() {
  const lastReportedHeight = useRef(0);

  useEffect(() => {
    function reportHeight() {
      const height = document.body.scrollHeight;
      if (height !== lastReportedHeight.current) {
        window.parent.postMessage(
          {
            type: "endatix:resize",
            height: height,
          },
          "*"
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
