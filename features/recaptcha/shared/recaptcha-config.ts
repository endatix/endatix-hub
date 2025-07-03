export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

export const RECAPTCHA_ACTIONS = {
  FORM_SUBMIT: "form_submit",
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
};

export const isReCaptchaEnabled = () => {
  return RECAPTCHA_SITE_KEY !== "";
};
