const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

const RECAPTCHA_ACTIONS = {
  SUBMIT_FORM: "submit_form",
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
};

const isReCaptchaEnabled = () => {
  return RECAPTCHA_SITE_KEY !== "";
};

const RECAPTCHA_JS_URL = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;

export const recaptchaConfig = {
  /**
   * reCAPTCHA site key
   */
  SITE_KEY: RECAPTCHA_SITE_KEY,

  /**
   * reCAPTCHA actions
   */
  ACTIONS: RECAPTCHA_ACTIONS,

  /**
   * Check if reCAPTCHA is enabled
   */
  isReCaptchaEnabled,

  /**
   * reCAPTCHA JS URL
   */
  JS_URL: RECAPTCHA_JS_URL,
};
