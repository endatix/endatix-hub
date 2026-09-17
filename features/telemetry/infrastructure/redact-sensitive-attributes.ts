const SENSITIVE_ATTRIBUTE_KEY =
  /(authorization|cookie|token|secret|password|api[-_ ]?key|connection[-_ ]?string)/i;

/**
 * Query params whose value is a credential: Azure SAS and S3 / GCS presigned
 * signatures, invite and reset tokens, OAuth / OIDC codes and tokens. Non-secret
 * SAS fields (`sv`, `se`, `sp`, …) stay readable for diagnosis. Matches at the
 * start of a bare query string (`url.query` has no leading `?`) as well as after
 * `?` / `&` inside a URL or message.
 */
const SENSITIVE_QUERY_PARAM =
  /((?:^|[?&])(?:sig|signature|token|access_token|id_token|id_token_hint|refresh_token|code|client_secret|password|api_key|apikey|x-amz-signature|x-amz-credential|x-amz-security-token|x-goog-signature|x-goog-credential)=)[^&#\s"'<>]*/gi;

export const REDACTED = "[REDACTED]";

/**
 * Booleans and numbers under a credential-like key (`hasToken: true`,
 * `tokenCount: 2`) are diagnostics, not secrets, so they keep their value and type.
 */
function isRedactableValue(value: unknown): boolean {
  return typeof value !== "boolean" && typeof value !== "number";
}

/** Credential-like keys become `[REDACTED]` on every log destination. */
export function redactSensitiveAttributes<T>(
  attributes: Readonly<Record<string, T>>,
): Record<string, T | typeof REDACTED> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      SENSITIVE_ATTRIBUTE_KEY.test(key) && isRedactableValue(value)
        ? REDACTED
        : value,
    ]),
  );
}

/** Replaces credential query-param values inside URLs, query strings and messages. */
export function redactSensitiveText(value: string): string {
  return value.replace(SENSITIVE_QUERY_PARAM, `$1${REDACTED}`);
}
