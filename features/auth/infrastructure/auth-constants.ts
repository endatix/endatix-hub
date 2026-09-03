const DEFAULT_RETURN_URL = "/forms";
const SIGNIN_PATH = "/signin";
const RETURN_URL_PARAM = "returnUrl";
const AUTH_ERROR_PATH = "/auth-error";
const SIGNOUT_PATH = "/signout";
const SESSION_BRIDGE_PATH = "/session-bridge";
const UNAUTHORIZED_PATH = "/unauthorized";

const AUTH_ROUTES = [
  SIGNIN_PATH,
  SIGNOUT_PATH,
  "/create-account",
  "/account-verification",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  AUTH_ERROR_PATH,
  SESSION_BRIDGE_PATH,
];

const HUB_PATHS = [
  "/forms",
  "/settings",
  "/my-account",
  "/admin",
  "/folders",
  "/data-lists",
];

const ENDATIX_AUTH_PROVIDER_ID = "endatix";

const TENANT_PUBLIC_AUTH_PREFIX = "/t/";

function isTenantPublicAuthPath(pathname: string): boolean {
  if (!pathname.startsWith(TENANT_PUBLIC_AUTH_PREFIX)) {
    return false;
  }

  const segments = pathname.slice(TENANT_PUBLIC_AUTH_PREFIX.length).split("/");
  return (
    segments.length === 2 &&
    segments[0].length > 0 &&
    (segments[1] === "signin" || segments[1] === "register")
  );
}

export {
  AUTH_ROUTES,
  ENDATIX_AUTH_PROVIDER_ID,
  DEFAULT_RETURN_URL,
  SIGNIN_PATH,
  RETURN_URL_PARAM,
  AUTH_ERROR_PATH,
  SIGNOUT_PATH,
  UNAUTHORIZED_PATH,
  HUB_PATHS,
  isTenantPublicAuthPath,
};
