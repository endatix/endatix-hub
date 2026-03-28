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

export { formatNumber, formatBytes, formatValue };
