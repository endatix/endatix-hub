import "server-only";

import { getApiConfig } from "@/features/config/api-config";
import {
  getClientEndatixConfig,
  getSurveyLicenseKey,
} from "@/features/config/server";
import type { PlatformAdminSession } from "../types";
import type { EnvironmentAdminSummary, SecretPresence } from "./types";

export type { EnvironmentAdminSummary, SecretPresence } from "./types";

function secretPresence(value: string | undefined): SecretPresence {
  return { configured: Boolean(value?.trim()) };
}

/**
 * Resolves Hub environment settings for the admin Environment page.
 * Uses the same runtime projection as layouts (`getClientEndatixConfig`) plus
 * optional base/prefix when the origin was built from `ENDATIX_BASE_URL`.
 * Secret values (PostHog key, reCAPTCHA site key, SurveyJS licence) are never
 * included — only Set / Not set presence flags.
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
      posthogKey: secretPresence(client.posthogKey),
      posthogHost: client.posthogHost,
      posthogUiHost: client.posthogUiHost,
    }),
    recaptcha: Object.freeze({
      siteKey: secretPresence(client.recaptchaSiteKey),
    }),
    surveyJs: Object.freeze({
      license: secretPresence(getSurveyLicenseKey()),
    }),
  });
}
