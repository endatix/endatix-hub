const DEFAULT_RETURN_URL = "/forms";
const SIGNIN_PATH = "/signin";
const RETURN_URL_PARAM = "returnUrl";
const SIGNIN_ERROR_PATH = "/auth-error";
const SIGNOUT_PATH = "/signout";
const SESSION_BRIDGE_PATH = "/session-bridge";

const AUTH_ROUTES = [
  SIGNIN_PATH,
  SIGNOUT_PATH,
  "/create-account",
  "/account-verification",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  SIGNIN_ERROR_PATH,
  SESSION_BRIDGE_PATH,
];
export {
  AUTH_ROUTES,
  DEFAULT_RETURN_URL,
  SIGNIN_PATH,
  RETURN_URL_PARAM,
  SIGNIN_ERROR_PATH,
  SIGNOUT_PATH,
};
