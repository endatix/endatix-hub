import { getIsomorphicEndatixConfig } from "@/features/config/client-endatix-config";

/** Request-time, never inlined — see `client-endatix-config.ts`. */
const siteKey = () => getIsomorphicEndatixConfig().recaptchaSiteKey;

const RECAPTCHA_ACTIONS = {
  SUBMIT_FORM: "submit_form",
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
};

const isReCaptchaEnabled = () => {
  return siteKey() !== "";
};

export const recaptchaConfig = {
  /**
   * reCAPTCHA site key. A getter, not a const: the value is only known at request time.
   */
  get SITE_KEY(): string {
    return siteKey();
  },

  /**
   * reCAPTCHA actions
   */
  ACTIONS: RECAPTCHA_ACTIONS,

  /**
   * Check if reCAPTCHA is enabled.
   *
   * Previously compared a non-null-asserted env read to "", so an UNSET key read as
   * ENABLED and loaded the reCAPTCHA script with `render=undefined`.
   * The config normalises a missing key to "", so unset now correctly reads as disabled.
   */
  isReCaptchaEnabled,

  /**
   * reCAPTCHA JS URL
   */
  get JS_URL(): string {
    return `https://www.google.com/recaptcha/api.js?render=${siteKey()}`;
  },
};
