import "server-only";

import { connection } from "next/server";
import {
  resolveEndatixSettings,
  type ClientEndatixConfig,
} from "./resolve-endatix-settings";

export { getSurveyLicenseKey } from "./survey-license.server";
export type { ClientEndatixConfig };

/**
 * Browser projection of the public config, resolved from `process.env` in the running
 * server process. Call from Server Component layouts and pass into `AppProvider` — not
 * via `nextConfig.env`.
 *
 * The `await connection()` is a prerender opt-out, not a per-request read: these values
 * come from the container environment and do not vary between requests. Without it Next
 * may prerender a route at `next build` and bake the build machine's environment into the
 * static HTML — the exact build-time inlining this module exists to remove. Today every
 * caller is already dynamic (`auth()` / `cookies()` / `headers()`), so this costs nothing;
 * it is the guard that keeps a future caller from silently regressing.
 */
export async function getClientEndatixConfig(): Promise<ClientEndatixConfig> {
  await connection();
  // `resolveEndatixSettings` already normalises and freezes this slice via
  // `toClientEndatixConfig`, so it is handed to the client tree as-is.
  return resolveEndatixSettings({ source: "runtime" }).client;
}
