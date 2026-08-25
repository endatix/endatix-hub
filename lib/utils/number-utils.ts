/**
 * Formats an integer with locale grouping (e.g. 5000 → "5,000" in en-US).
 * Uses the runtime locale when `locale` is omitted.
 */
export function toLocaleNumber(value: number, locale?: string): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  return value.toLocaleString(locale, { maximumFractionDigits: 0 });
}
