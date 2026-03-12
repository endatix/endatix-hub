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
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export { formatNumber, formatBytes };
