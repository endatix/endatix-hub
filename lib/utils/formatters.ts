const VALID_DATE_STYLES = Object.freeze([
  "full",
  "long",
  "medium",
  "short",
] as const);

type DateStyle = (typeof VALID_DATE_STYLES)[number];

/**
 * Checks if a value is a valid Date object.
 * @param value - The value to check
 * @returns True if the value is a valid Date object, false otherwise
 */
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Parses a number value into a number.
 * @param value - The value to parse
 * @returns The parsed number, or null if the value is not a number
 */
function parseNumberValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "boolean") return value ? 1 : 0;

  return null;
}

/**
 * Formats a number into a string in the format of 1.2k, 1.2m, 1.2b, etc.
 * @param number - The number to format
 * @param fallback - The fallback value if the number is null or undefined
 * @returns Formatted string of the number in the format of 1.2k, 1.2m, 1.2b, etc.
 */
function formatNumber(number: number, fallback: string = "-"): string {
  if (!number) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

/**
 * Formats an integer with locale grouping (e.g. 5,000).
 * Prefer this for table counts and pager totals over compact {@link formatNumber}.
 */
function formatInteger(
  value: number,
  locale?: string,
  fallback: string = "-",
): string {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a number as currency.
 * @param value - The number to format
 * @param currencyCode - The currency code (default: USD)
 * @param locale - The locale to use (default: browser locale)
 * @returns Formatted currency string
 */
function formatCurrency(
  value: number,
  currencyCode: string = "USD",
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

/**
 * Formats a number with specified decimal places.
 * @param value - The number to format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @param locale - The locale to use (default: browser locale)
 * @returns Formatted number string
 */
function formatDecimalNumber(
  value: number,
  decimalPlaces: number = 2,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

/**
 * Formats a date using Intl.DateTimeFormat.
 * @param value - The date to format (Date, string, or number)
 * @param dateStyle - The date style: 'full', 'long', 'medium', 'short' (default: short)
 * @param locale - The locale to use (default: browser locale)
 * @returns Formatted date string
 */
function formatDateTime(
  value: unknown,
  dateStyle: DateStyle = "short",
  locale?: string,
): string {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  let dateValue: Date | null = null;

  if (isValidDate(value)) {
    dateValue = value;
  } else {
    const parsed = new Date(value as string | number);
    if (isValidDate(parsed)) {
      dateValue = parsed;
    }
  }

  if (!dateValue) {
    if (typeof value === "object" || typeof value === "function") {
      return "";
    }

    return String(value);
  }

  return new Intl.DateTimeFormat(locale, { dateStyle }).format(dateValue);
}

/**
 * Formats bytes into a human-readable string (B, KB, MB, GB, TB)
 * @param bytes - The number of bytes to format
 * @param decimals - The number of decimal places to include, defaults to 2
 * @returns Formatted string of the bytes (e.g. 1.23 MB)
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (!+bytes) return "0 B";

  const k = 1024;
  const dm = Math.max(0, decimals);
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
/**
 * Formats an unknown value into a display string
 * @param value - The value to format (can be string, number, boolean, array, object, or null/undefined)
 * @returns A human-readable string representation of the value
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    return `[${value.length} items]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return "{}";
    }
    return `{${keys.length} keys}`;
  }

  if (typeof value === "function") {
    return "[function]";
  }

  return String(value);
}

export {
  formatNumber,
  formatInteger,
  formatCurrency,
  formatDecimalNumber,
  formatDateTime,
  formatBytes,
  formatValue,
  parseNumberValue,
  type DateStyle,
  VALID_DATE_STYLES,
};
