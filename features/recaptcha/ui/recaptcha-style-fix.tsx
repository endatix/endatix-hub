"use client";

import { useEffect } from "react";

/**
 * Component that fixes reCAPTCHA logo z-index when reCAPTCHA is loaded
 */
export function ReCaptchaStyleFix() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .grecaptcha-badge {
        z-index: 9999 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return null;
}
