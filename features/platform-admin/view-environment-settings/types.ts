/**
 * Whether a genuine secret is configured, without exposing its value.
 *
 * Reserved for values the browser never receives. A key that this app already ships to
 * every visitor — a reCAPTCHA *site* key, a PostHog *project* key — is not a secret, and
 * reducing it to a boolean costs the operator the ability to confirm which key is live
 * while hiding nothing that is not already in the page source.
 */
export type SecretPresence = {
  readonly configured: boolean;
};

/** Server-safe Hub runtime snapshot for platform admin. */
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
  /** Public values: every field here is part of the browser projection. */
  readonly analytics: {
    readonly posthogKey: string;
    readonly posthogHost: string;
    readonly posthogUiHost: string;
  };
  /** Public value: the site key is embedded in the reCAPTCHA script URL on every form. */
  readonly recaptcha: {
    readonly siteKey: string;
  };
  /** The one genuine secret on this page — server-only, presence flag only. */
  readonly surveyJs: {
    readonly license: SecretPresence;
  };
};
