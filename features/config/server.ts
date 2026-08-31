import "server-only";

import { connection } from "next/server";
import {
  resolveEndatixSettings,
  type ClientEndatixConfig,
} from "./resolve-endatix-settings";
import { toClientEndatixConfig } from "./client-endatix-config";
import { getSurveyLicenseKey } from "./survey-license.server";

export { getSurveyLicenseKey };
export type { ClientEndatixConfig };

/**
 * Request-time browser projection. Call from Server Component layouts and pass into
 * AppProvider — not via `nextConfig.env`. Pins dynamic rendering via `connection()`.
 */
export async function getClientEndatixConfig(): Promise<ClientEndatixConfig> {
  await connection();
  const resolved = resolveEndatixSettings({ source: "runtime" });
  return toClientEndatixConfig(resolved.client);
}
