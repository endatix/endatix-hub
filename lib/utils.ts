import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DateInput } from "./date-utils";

/**
 * Merges class names using clsx and tailwind-merge. Comes with ShadCN/UI
 * @param inputs - Class names to merge
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a cryptographically secure random integer in [min, max] (inclusive).
 * Uses crypto.getRandomValues; avoid Math.random() for security-sensitive or lint compliance.
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in [min, max]
 */
export function generateRandomNumber(min: number, max: number): number {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  const normalized = array[0] / (0xffffffff + 1);

  return Math.floor(normalized * (max - min + 1)) + min;
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

type ElapsedTimeFormat = "short" | "long" | "compact";

/**
 * Calculates and formats the elapsed time between two dates
 * @param startedAt - The start date/time
 * @param completedAt - The end date/time
 * @param format - `short` (HH:MM:SS), `long` (prose), or `compact` (`1m 41s`) for dense grids
 * @returns Formatted elapsed time, or "-" if invalid input
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

  if (format === "compact") {
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (mins > 0) {
      parts.push(`${mins}m`);
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs}s`);
    }

    return parts.join(" ");
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
 * Resolves the engagement start used for completion duration.
 * Prefers API `startedAt` (first respondent save); falls back to `createdAt` for older payloads.
 */
export function getSubmissionStartedAt(submission: {
  startedAt?: DateInput;
  createdAt: Date | string;
}): Date {
  if (submission.startedAt) {
    return new Date(submission.startedAt);
  }

  return new Date(submission.createdAt);
}

/**
 * Formats a date into a localized date/time string.
 * @param date - The date to format
 * @param fallbackMessage - Message when the date is missing or invalid
 * @returns Formatted date string, or the fallback message
 */
export function getFormattedDate(
  date?: DateInput,
  fallbackMessage = "-",
): string {
  if (!date) {
    return fallbackMessage;
  }

  const dateValue = date instanceof Date ? date : new Date(date);
  if (isNaN(dateValue.getTime())) {
    return fallbackMessage;
  }

  return dateValue.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour12: true,
  });
}

/**
 * Token permission types for public submission access
 */
export const TokenPermission = {
  Read: "r",
  Write: "w",
  Export: "x",
  Submit: "s",
} as const;

export type TokenPermissionValue =
  (typeof TokenPermission)[keyof typeof TokenPermission];

/**
 * Checks if an access token has a specific permission.
 * Token format: {submissionId}.{expiryUnix}.{permissionsCode}.{signature}
 * @param token - The access token string
 * @param permission - The permission to check (TokenPermission.Read or TokenPermission.Write)
 * @returns true if the token has the specified permission
 */
export function hasTokenPermission(
  token: string,
  permission: TokenPermissionValue,
): boolean {
  const parts = token.split(".");
  if (parts.length < 4) {
    return false;
  }
  const permissionsCode = parts[2];
  return permissionsCode.includes(permission);
}

/**
 * Share/embed continuation tokens use submit (`s`), or legacy read+write (`rw`).
 */
export function hasShareContinuationTokenPermission(token: string): boolean {
  return (
    hasTokenPermission(token, TokenPermission.Submit) ||
    (hasTokenPermission(token, TokenPermission.Read) &&
      hasTokenPermission(token, TokenPermission.Write))
  );
}

/**
 * Checks if a token is an access token (4-part format) or a partial submission token (hex format).
 * Access tokens: {submissionId}.{expiryUnix}.{permissionsCode}.{signature}
 * Partial tokens: hexadecimal string
 * @param token - The token string to check
 * @returns true if access token, false if partial/hex token
 */
export function isAccessToken(token: string): boolean {
  if (!token) return false;
  return token.split(".").length === 4;
}

/**
 * Parses an access token to extract the expiry timestamp.
 * Token format: {submissionId}.{expiryUnix}.{permissionsCode}.{signature}
 * @param token - The access token string
 * @returns The expiry time in milliseconds, or null if invalid
 */
export function parseTokenExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 4) return null;
  const expiryUnix = parseInt(parts[1], 10);
  return isNaN(expiryUnix) ? null : expiryUnix * 1000; // Convert to milliseconds
}
