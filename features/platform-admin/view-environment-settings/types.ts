/** Whether a secret env var is configured without exposing its value. */
export type SecretPresence = {
  readonly configured: boolean;
};

/** Server-safe Hub runtime snapshot for platform admin (no secret values). */
export type EnvironmentAdminSummary = {
  readonly api: {
    readonly apiUrl: string;
    readonly apiConfigured: boolean;
    readonly baseUrl: string | null;
    readonly prefix: string | null;
  };
  readonly experimental: {
    readonly extensionsEnabled: boolean;
  };
  readonly debug: {
    readonly isDebugMode: boolean;
    readonly nodeEnv: string;
  };
  readonly analytics: {
    readonly posthogKey: SecretPresence;
    readonly posthogHost: string;
    readonly posthogUiHost: string;
  };
  readonly recaptcha: {
    readonly siteKey: SecretPresence;
  };
  readonly surveyJs: {
    readonly license: SecretPresence;
  };
};
