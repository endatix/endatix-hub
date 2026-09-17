const SENSITIVE_ATTRIBUTE_KEY =
  /(authorization|cookie|token|secret|password|api[-_ ]?key|connection[-_ ]?string)/i;

export const REDACTED = "[REDACTED]";

/** Redact credential-like keys in records Hub prints to stdout. */
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
