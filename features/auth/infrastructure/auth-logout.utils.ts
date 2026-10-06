import type { JWT } from "next-auth/jwt";
import { authRegistry } from "./auth-provider-registry";
import { SIGNIN_PATH } from "./auth-constants";
import { supportsFederatedLogout } from "./federated-logout.types";
import { getPostLogoutRedirectUri } from "./oidc-logout.utils";
import { isValidAbsoluteUrl } from "@/lib/utils/url-utils";
import { TelemetryLogger } from "@/features/telemetry";

const LOGGER_NAME = "auth.logout";

/**
 * Resolves the federated logout URL for the provider.
 * @param token - The token to resolve the federated logout URL for.
 * @returns The federated logout URL or null if the provider does not support federated logout.
 */
export function resolveFederatedLogoutUrl(token: JWT | null): string | null {
  if (!token || typeof token.provider !== "string") {
    return null;
  }

  const authUrl = readAuthUrl();
  if (!authUrl) {
    return null;
  }

  const provider = authRegistry.getProvider(token.provider);

  if (!supportsFederatedLogout(provider)) {
    return null;
  }

  try {
    return provider.resolveFederatedLogoutUrl({
      token,
      postLogoutRedirectUri: getPostLogoutRedirectUri(
        authUrl,
        SIGNIN_PATH,
        process.env.NEXT_PUBLIC_BASE_PATH,
      ),
    });
  } catch (error) {
    TelemetryLogger.error(
      "Failed to resolve federated logout URL",
      error,
      { reason: "logout_url_failed" },
      LOGGER_NAME,
    );
    return null;
  }
}

function readAuthUrl(): string | null {
  const authUrl = process.env.AUTH_URL;
  if (!authUrl) {
    warnLogout(
      "Federated logout requested but AUTH_URL is missing",
      "auth_url_missing",
    );
    return null;
  }
  if (!isValidAbsoluteUrl(authUrl)) {
    warnLogout(
      "Federated logout requested but AUTH_URL is not a valid URL",
      "auth_url_invalid",
    );
    return null;
  }
  return authUrl;
}

function warnLogout(message: string, reason: string): void {
  TelemetryLogger.warn(message, { reason }, LOGGER_NAME);
}
