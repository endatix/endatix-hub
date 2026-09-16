const SENSITIVE_ATTRIBUTE_KEY =
  /(authorization|cookie|token|secret|password|api[-_ ]?key|connection[-_ ]?string)/i;

export const REDACTED = "[REDACTED]";

/**
 * Replaces the value of every attribute whose key looks like a credential.
 *
 * Applied wherever Hub itself prints records (console fallback, JSON stdout), so
 * a log call that carries a token by mistake does not end up in container logs.
 */
export function redactSensitiveAttributes<T>(
  attributes: Readonly<Record<string, T>>,
): Record<string, T | typeof REDACTED> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      SENSITIVE_ATTRIBUTE_KEY.test(key) ? REDACTED : value,
    ]),
  );
}
