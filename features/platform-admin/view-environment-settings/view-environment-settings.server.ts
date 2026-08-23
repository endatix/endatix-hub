import "server-only";

import { getApiConfig } from "@/features/config/api-config";
import { getClientEndatixConfig } from "@/features/config/resolve-endatix-settings";
import type { PlatformAdminSession } from "../types";
import type { EnvironmentAdminSummary } from "./types";

export type { EnvironmentAdminSummary } from "./types";

/**
 * Resolves Hub environment settings for the admin Environment page.
 * Uses the same runtime projection as layouts (`getClientEndatixConfig`) plus
 * optional base/prefix when the origin was built from `ENDATIX_BASE_URL`.
 */
export async function getEnvironmentSettings(
  _session: PlatformAdminSession,
): Promise<EnvironmentAdminSummary> {
  const client = getClientEndatixConfig();
  const apiConfig = getApiConfig();
  const apiUrl = client.apiBaseUrl.trim();
  const apiConfigured = apiUrl.length > 0 && apiConfig !== null;

  return Object.freeze({
    apiUrl: apiConfigured ? apiUrl : "",
    apiConfigured,
    baseUrl: apiConfigured ? (apiConfig.baseUrl ?? null) : null,
    prefix: apiConfigured ? (apiConfig.prefix ?? null) : null,
    extensionsEnabled: client.extensionsEnabled,
  });
}
