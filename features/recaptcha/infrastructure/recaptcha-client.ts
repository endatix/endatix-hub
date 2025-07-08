import { recaptchaConfig } from "../recaptcha-config";

// Declare grecaptcha on the Window interface for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

/**
 * Loads the reCAPTCHA script into the document head.
 * @returns A promise that resolves when the script is loaded.
 */
export const loadReCaptchaScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = recaptchaConfig.JS_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

/**
 * Get the reCAPTCHA token for the given action.
 * @param action - The action to get the token for.
 * @returns The reCAPTCHA token.
 */
export const getReCaptchaToken = async (action: string): Promise<string> => {
  await loadReCaptchaScript();

  return new Promise((resolve) => {
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(recaptchaConfig.SITE_KEY, { action })
        .then(resolve);
    });
  });
};
