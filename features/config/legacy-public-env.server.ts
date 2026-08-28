/**
 * Deprecated `NEXT_PUBLIC_*` names, kept so an existing self-hosted `.env` keeps working
 * across the rename to `ENDATIX_*`.
 *
 * SERVER ONLY — and the file name is the contract. Next's DefinePlugin inlines any
 * `process.env.NEXT_PUBLIC_*` literal it finds in a module that is reachable from a client
 * component, which is exactly the build-time baking this feature exists to remove. Keeping
 * these reads in a module that no client component imports is what makes them a runtime
 * lookup. `no-build-time-client-config.test.ts` enforces both halves.
 *
 * Delete this file once the deprecation window closes.
 */

import { DEFAULT_POSTHOG_HOST } from "./client-endatix-config";

/** First non-empty value, after trimming. */
function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

export interface LegacyPublicEnv {
  readonly surveyLicenseKey: string;
  readonly recaptchaSiteKey: string;
  readonly posthogKey: string;
  readonly posthogHost: string;
  readonly posthogUiHost: string;
  readonly debugMode: string;
  readonly submitterPrimaryFilterLabel: string;
  readonly submitterGridProfileFields: string;
}

export function readLegacyPublicEnv(): LegacyPublicEnv {
  return {
    surveyLicenseKey: firstNonEmpty(process.env.NEXT_PUBLIC_SLK),
    recaptchaSiteKey: firstNonEmpty(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
    posthogKey: firstNonEmpty(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    posthogHost: firstNonEmpty(process.env.NEXT_PUBLIC_POSTHOG_HOST),
    posthogUiHost: firstNonEmpty(process.env.NEXT_PUBLIC_POSTHOG_UI_HOST),
    debugMode: firstNonEmpty(process.env.NEXT_PUBLIC_IS_DEBUG_MODE),
    submitterPrimaryFilterLabel: firstNonEmpty(
      process.env.NEXT_PUBLIC_SUBMITTER_PRIMARY_FILTER_LABEL,
    ),
    submitterGridProfileFields: firstNonEmpty(
      process.env.NEXT_PUBLIC_SUBMITTER_GRID_PROFILE_FIELDS,
    ),
  };
}

/**
 * The SurveyJS Creator licence key, read on the server.
 *
 * Deliberately NOT part of {@link ClientEndatixConfig}: that projection is serialised into
 * the HTML of every page that mounts `AppProvider`, including the anonymous public form
 * routes, and a respondent filling in a form has no use for a commercial licence key. Only
 * the authenticated designer surface receives it, via `SurveyLicenseProvider`.
 */
export function getServerPostHogConfig(): {
  readonly key: string;
  readonly host: string;
} {
  const legacy = readLegacyPublicEnv();
  return {
    key: firstNonEmpty(process.env.ENDATIX_POSTHOG_KEY, legacy.posthogKey),
    host:
      firstNonEmpty(process.env.ENDATIX_POSTHOG_HOST, legacy.posthogHost) ||
      DEFAULT_POSTHOG_HOST,
  };
}

export function getSurveyLicenseKey(): string {
  return firstNonEmpty(
    process.env.ENDATIX_SURVEY_LICENSE_KEY,
    process.env.NEXT_PUBLIC_SLK,
  );
}
