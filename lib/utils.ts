import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names using clsx and tailwind-merge. Comes with ShadCN/UI
 * @param inputs - Class names to merge
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Delays execution for specified milliseconds. Used for testing purposes.
 * @param ms - Number of milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses a date value into a Date object
 * @param date - The date to parse, can be Date object or date string
 * @returns Date object if valid input, null if invalid or empty
 */
export function parseDate(date: Date): Date | null {
  try {
    if (!date) {
      return null;
    }

    const dateValue = date instanceof Date ? date : new Date(date);
    return isNaN(dateValue.getTime()) ? null : dateValue;
  } catch {
    return null;
  }
}

type ElapsedTimeFormat = "short" | "long";

/**
 * Calculates and formats the elapsed time between two dates
 * @param startedAt - The start date/time
 * @param completedAt - The end date/time
 * @param format - Format of the output string ("short" or "long"), defaults to "short"
 * @returns Formatted string of elapsed time in HH:MM:SS format, or "-" if invalid input
 */
export function getElapsedTimeString(
  startedAt?: Date,
  completedAt?: Date,
  format: ElapsedTimeFormat = "short",
): string {
  if (!startedAt || !completedAt) return "-";
  if (completedAt < startedAt) return "-";

  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  if (format === "short") {
    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMins = mins.toString().padStart(2, "0");
    const formattedSecs = secs.toString().padStart(2, "0");

    return `${formattedHours}:${formattedMins}:${formattedSecs}`;
  }

  const formattedHours = hours.toString().padStart(1, "0");
  const formattedMins = mins.toString().padStart(1, "0");
  const formattedSecs = secs.toString().padStart(1, "0");

  if (hours == 0) {
    return `${formattedMins} minutes ${formattedSecs} seconds`;
  }

  return `${formattedHours} hours ${formattedMins} minutes`;
}

/**
 * Formats a date into a string in the format of HH:MM:SS
 * @param date - The date to format
 * @returns Formatted string of the date in the format of HH:MM:SS
 */
export function getFormattedDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour12: true,
  });
}

/**
 * Formats a number into a string in the format of 1.2k, 1.2m, 1.2b, etc.
 * @param number - The number to format
 * @param fallback - The fallback value if the number is null or undefined
 * @returns Formatted string of the number in the format of 1.2k, 1.2m, 1.2b, etc.
 */
export function formatNumber(number: number, fallback: string = "-"): string {
  if (!number) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}
