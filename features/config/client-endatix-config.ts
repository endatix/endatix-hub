/**
 * Browser-safe Endatix settings. Origin URL and a boolean only — no secrets,
 * storage keys, or auth. Safe to send to the client.
 *
 * React trees read this via {@link EndatixConfigProvider}. Non-React
 * SurveyJS fetchers read {@link getBrowserEndatixConfig} (they cannot use a hook).
 */

export interface ClientEndatixConfig {
  readonly apiBaseUrl: string;
  readonly extensionsEnabled: boolean;
}

export const EMPTY_CLIENT_ENDATIX_CONFIG: ClientEndatixConfig = Object.freeze({
  apiBaseUrl: "",
  extensionsEnabled: false,
});

let browserConfig: ClientEndatixConfig = EMPTY_CLIENT_ENDATIX_CONFIG;

/**
 * Picks only the public fields so a wider server object cannot leak into the client.
 */
export function toClientEndatixConfig(
  value: ClientEndatixConfig,
): ClientEndatixConfig {
  return Object.freeze({
    apiBaseUrl: value.apiBaseUrl,
    extensionsEnabled: value.extensionsEnabled === true,
  });
}

/**
 * Last hydrated client projection. Used by SurveyJS event handlers that are not React.
 */
export function getBrowserEndatixConfig(): ClientEndatixConfig {
  return browserConfig;
}

/** Called from {@link EndatixConfigProvider} during render (before children). */
export function hydrateBrowserEndatixConfig(config: ClientEndatixConfig): void {
  browserConfig = config;
}

export function resetBrowserEndatixConfigForTests(): void {
  browserConfig = EMPTY_CLIENT_ENDATIX_CONFIG;
}
