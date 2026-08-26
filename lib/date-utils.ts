/**
 * Shared Hub date helpers for list/grid surfaces (format + calendar-day validation).
 * Detail views, PDF, and exports should keep using `getFormattedDate` in `lib/utils.ts`.
 */

export const RELATIVE_DATE_CUTOFF_DAYS = 14;

/** Fixed timezone for deterministic absolute SSR/client formatting on list surfaces. */
export const HUB_LIST_DATE_TIMEZONE = "UTC";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const compactDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: HUB_LIST_DATE_TIMEZONE,
});

const preciseDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: HUB_LIST_DATE_TIMEZONE,
});

export type DateInput = Date | string | null;

/**
 * Parses a date-like value into a valid Date, or null when invalid/missing.
 */
export function toValidDate(date?: DateInput): Date | null {
  if (date == null || date === "") {
    return null;
  }

  const dateValue = date instanceof Date ? date : new Date(date);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

/**
 * True when `value` is a real UTC calendar day `YYYY-MM-DD`
 * (rejects overflow dates such as 2024-13-01 and garbage).
 */
export function isValidCalendarDateYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Compact absolute datetime for dense grids (no seconds), e.g. `Jul 21, 2:53 PM`.
 */
export function formatCompactDateTime(
  date?: DateInput,
  fallbackMessage = "-",
): string {
  const dateValue = toValidDate(date);
  if (dateValue === null) {
    return fallbackMessage;
  }

  return compactDateTimeFormatter.format(dateValue);
}

/**
 * Precise absolute datetime for tooltips / hover (includes seconds).
 * Matches the precision style of detail `getFormattedDate` plus seconds.
 */
export function formatPreciseDateTime(
  date?: DateInput,
  fallbackMessage = "-",
): string {
  const dateValue = toValidDate(date);
  if (dateValue === null) {
    return fallbackMessage;
  }

  return preciseDateTimeFormatter.format(dateValue);
}

function formatRelativeWithinCutoff(dateValue: Date, now: Date): string | null {
  const diffMs = dateValue.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs >= RELATIVE_DATE_CUTOFF_DAYS * MS_PER_DAY) {
    return null;
  }

  const absSeconds = Math.round(absDiffMs / MS_PER_SECOND);
  const absMinutes = Math.round(absDiffMs / MS_PER_MINUTE);
  const absHours = Math.round(absDiffMs / MS_PER_HOUR);
  const absDays = Math.round(absDiffMs / MS_PER_DAY);
  const sign = diffMs < 0 ? -1 : 1;

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(sign * absSeconds, "second");
  }

  if (absMinutes < 60) {
    return relativeTimeFormatter.format(sign * absMinutes, "minute");
  }

  if (absHours < 24) {
    return relativeTimeFormatter.format(sign * absHours, "hour");
  }

  return relativeTimeFormatter.format(sign * absDays, "day");
}

/**
 * Hybrid list/grid datetime: relative within {@link RELATIVE_DATE_CUTOFF_DAYS},
 * otherwise compact absolute.
 *
 * Pass `now` for relative formatting (tests and client-after-mount). When omitted,
 * returns compact absolute only so SSR and the first client paint stay aligned.
 */
export function formatRelativeOrCompactDateTime(
  date?: DateInput,
  now?: Date,
  fallbackMessage = "-",
): string {
  const dateValue = toValidDate(date);
  if (dateValue === null) {
    return fallbackMessage;
  }

  if (now !== undefined) {
    const relative = formatRelativeWithinCutoff(dateValue, now);
    if (relative !== null) {
      return relative;
    }
  }

  return formatCompactDateTime(dateValue, fallbackMessage);
}
