import "server-only";

import { getApiConfig } from "@/features/config/api-config";
import {
  getClientEndatixConfig,
  getSurveyLicenseKey,
} from "@/features/config/server";
import type { PlatformAdminSession } from "../types";
import type { EnvironmentAdminSummary, SecretPresence } from "./types";

export type { EnvironmentAdminSummary, SecretPresence } from "./types";

/**
 * Collapses a genuine secret to a presence flag. The value itself never leaves the server,
 * so a blank or whitespace-only env var reports as not configured.
 */
function secretPresence(value: string | undefined): SecretPresence {
  return { configured: Boolean(value?.trim()) };
}

/**
 * Resolves Hub environment settings for the admin Environment page.
 * Uses the same runtime projection as layouts (`getClientEndatixConfig`) plus
 * optional base/prefix when the origin was built from `ENDATIX_BASE_URL`.
 *
 * What is included is decided by where the value already goes, not by how secret it
 * sounds. The PostHog project key and the reCAPTCHA site key are members of
 * `ClientEndatixConfig`: this app serialises both into the HTML of every public form
 * page, so withholding them here hides nothing and only stops an operator confirming
 * which key is live. The SurveyJS licence never reaches a browser, so it stays a
 * presence flag.
 */
export async function getEnvironmentSettings(
  _session: PlatformAdminSession,
): Promise<EnvironmentAdminSummary> {
  const client = await getClientEndatixConfig();
  const apiConfig = getApiConfig();
  const apiUrl = client.apiBaseUrl.trim();
  const apiConfigured = apiUrl.length > 0 && apiConfig !== null;

  return Object.freeze({
    api: Object.freeze({
      apiUrl: apiConfigured ? apiUrl : "",
      apiConfigured,
      baseUrl: apiConfigured ? (apiConfig.baseUrl ?? null) : null,
      prefix: apiConfigured ? (apiConfig.prefix ?? null) : null,
    }),
    experimental: Object.freeze({
      extensionsEnabled: client.extensionsEnabled,
    }),
    debug: Object.freeze({
      isDebugMode: client.isDebugMode,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    }),
    analytics: Object.freeze({
      posthogKey: client.posthogKey,
      posthogHost: client.posthogHost,
      posthogUiHost: client.posthogUiHost,
    }),
    recaptcha: Object.freeze({
      siteKey: client.recaptchaSiteKey,
    }),
    surveyJs: Object.freeze({
      license: secretPresence(getSurveyLicenseKey()),
    }),
  });
}
