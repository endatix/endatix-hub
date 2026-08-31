/**
 * Browser-safe Endatix settings. Public, non-secret values only — no storage keys,
 * no auth secrets. Safe to send to the client.
 *
 * Every field here is resolved at REQUEST time, never inlined at build time. That is the
 * point of this module: a value baked into the client bundle can only be changed by
 * rebuilding and redeploying the image, which breaks promote-the-same-artifact releases.
 *
 * Licence keys in particular must always be replaceable at runtime — swapping one should be
 * a config change, never a rebuild. That is a standing rule for any licence this project
 * carries, not a property of one vendor's terms.
 *
 * React trees read this via {@link EndatixConfigProvider}. Non-React SurveyJS fetchers and
 * isomorphic modules read {@link getIsomorphicEndatixConfig}.
 */

export interface ClientEndatixConfig {
  readonly apiBaseUrl: string;
  readonly extensionsEnabled: boolean;
  readonly recaptchaSiteKey: string;
  readonly posthogKey: string;
  readonly posthogHost: string;
  readonly posthogUiHost: string;
  readonly isDebugMode: boolean;
  readonly submitterPrimaryFilterLabel: string;
  readonly submitterGridProfileFields: string;
}

/** Compile-time guard: secrets must never be added to the browser projection type. */
type ForbiddenClientConfigKeys =
  | "surveyLicenseKey"
  | "sessionSecret"
  | "authSecret"
  | "keycloakClientSecret";

type _AssertClientConfigAllowlist =
  Extract<ForbiddenClientConfigKeys, keyof ClientEndatixConfig> extends never
    ? true
    : never;

const _clientConfigAllowlist: _AssertClientConfigAllowlist = true;
void _clientConfigAllowlist;

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
export const DEFAULT_SUBMITTER_PRIMARY_FILTER_LABEL = "Submitter";

export const EMPTY_CLIENT_ENDATIX_CONFIG: ClientEndatixConfig = Object.freeze({
  apiBaseUrl: "",
  extensionsEnabled: false,
  recaptchaSiteKey: "",
  posthogKey: "",
  posthogHost: DEFAULT_POSTHOG_HOST,
  posthogUiHost: "",
  isDebugMode: false,
  submitterPrimaryFilterLabel: DEFAULT_SUBMITTER_PRIMARY_FILTER_LABEL,
  submitterGridProfileFields: "",
});

let browserConfig: ClientEndatixConfig = EMPTY_CLIENT_ENDATIX_CONFIG;

/**
 * Picks only the public fields so a wider server object cannot leak into the client.
 */
export function toClientEndatixConfig(
  value: ClientEndatixConfig,
): ClientEndatixConfig {
  return Object.freeze({
    apiBaseUrl: value.apiBaseUrl ?? "",
    extensionsEnabled: value.extensionsEnabled === true,
    recaptchaSiteKey: value.recaptchaSiteKey ?? "",
    posthogKey: value.posthogKey ?? "",
    posthogHost: value.posthogHost || DEFAULT_POSTHOG_HOST,
    posthogUiHost: value.posthogUiHost ?? "",
    isDebugMode: value.isDebugMode === true,
    // Defaulted, not passed through: a partial or legacy object would otherwise yield
    // undefined here, and `submitterGridProfileFields.split(",")` would throw.
    submitterPrimaryFilterLabel:
      value.submitterPrimaryFilterLabel ||
      DEFAULT_SUBMITTER_PRIMARY_FILTER_LABEL,
    submitterGridProfileFields: value.submitterGridProfileFields ?? "",
  });
}

/** First non-empty value, after trimming. `undefined` and blank strings are skipped. */
function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

/**
 * The public slice of the runtime environment.
 *
 * `ENDATIX_*` only. This module is imported by client components, and Next inlines any
 * `NEXT_PUBLIC_`-prefixed env literal it finds in a client-reachable module at build time —
 * so the deprecated names live in `legacy-public-env.server.ts`, which no client component
 * imports. At Node boot, `applyLegacyPublicEnv()` folds them into `ENDATIX_*` once; every
 * consumer then reads only the current names (including SSR of `getIsomorphicEndatixConfig`).
 *
 * Non-`NEXT_PUBLIC_` reads are safe here: Next does not inline them, so in the browser they
 * simply resolve to `undefined` and the hydrated projection supplies the value instead.
 */
export function readPublicEndatixEnv(): Omit<
  ClientEndatixConfig,
  "apiBaseUrl" | "extensionsEnabled"
> {
  const debugOverride = firstNonEmpty(process.env.ENDATIX_IS_DEBUG_MODE);

  return {
    recaptchaSiteKey: firstNonEmpty(process.env.ENDATIX_RECAPTCHA_SITE_KEY),
    posthogKey: firstNonEmpty(process.env.ENDATIX_POSTHOG_KEY),
    posthogHost:
      firstNonEmpty(process.env.ENDATIX_POSTHOG_HOST) || DEFAULT_POSTHOG_HOST,
    posthogUiHost: firstNonEmpty(process.env.ENDATIX_POSTHOG_UI_HOST),
    // Explicit override wins; otherwise debug follows the development build.
    isDebugMode: debugOverride
      ? debugOverride === "true"
      : process.env.NODE_ENV === "development",
    submitterPrimaryFilterLabel:
      firstNonEmpty(process.env.ENDATIX_SUBMITTER_PRIMARY_FILTER_LABEL) ||
      DEFAULT_SUBMITTER_PRIMARY_FILTER_LABEL,
    submitterGridProfileFields: firstNonEmpty(
      process.env.ENDATIX_SUBMITTER_GRID_PROFILE_FIELDS,
    ),
  };
}

/**
 * Last hydrated client projection. Used by SurveyJS event handlers that are not React.
 */
export function getBrowserEndatixConfig(): ClientEndatixConfig {
  return browserConfig;
}

/**
 * Same values on both sides of the boundary, for modules that run in either.
 *
 * In the browser this is the projection {@link EndatixConfigProvider} hydrated during
 * render. On the server it is a direct runtime `process.env` read — deliberately not the
 * module-level `browserConfig`, which SSR of a client component would otherwise share
 * across requests.
 *
 * `apiBaseUrl`/`extensionsEnabled` are omitted on the server path; server callers that need
 * those use `getClientEndatixConfig()` from `@/features/config/server`, which resolves the full
 * object including API settings.
 */
export function getIsomorphicEndatixConfig(): ClientEndatixConfig {
  if (typeof window !== "undefined") {
    return browserConfig;
  }
  return Object.freeze({
    apiBaseUrl: "",
    extensionsEnabled: false,
    ...readPublicEndatixEnv(),
  });
}

/** Called from {@link EndatixConfigProvider} during render (before children). */
export function hydrateBrowserEndatixConfig(config: ClientEndatixConfig): void {
  browserConfig = config;
}

export function resetBrowserEndatixConfigForTests(): void {
  browserConfig = EMPTY_CLIENT_ENDATIX_CONFIG;
}
