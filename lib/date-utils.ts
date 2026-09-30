/**
 * Shared Hub date helpers: calendar-day validation, list datetime formatters,
 * and duration (`formatDuration`). Absolute detail/PDF timestamps stay on
 * `getFormattedDate` in `lib/utils.ts`.
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

export type DurationFormat = "short" | "long" | "compact";

const SECOND = "second";
const MINUTE = "minute";
const HOUR = "hour";
const DAY = "day";

/**
 * Formats a non-negative duration.
 * `compact` is for dense grids (`50d 1h`). `long` is prose (`50 days 1 hour`).
 * `short` is a clock (`HH:MM:SS`) with total hours, not rolled into days.
 * Smaller units drop as the span grows: seconds under an hour, minutes under a day.
 * Returns "-" for a negative or non-finite value.
 */
export function formatDuration(
  durationMs: number,
  format: DurationFormat = "compact",
): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return "-";
  }

  const totalSeconds = Math.floor(durationMs / MS_PER_SECOND);
  const days = Math.floor(totalSeconds / (MS_PER_DAY / MS_PER_SECOND));

  const hours = Math.floor(
    (totalSeconds % (MS_PER_DAY / MS_PER_SECOND)) /
      (MS_PER_HOUR / MS_PER_SECOND),
  );

  const minutes = Math.floor(
    (totalSeconds % (MS_PER_HOUR / MS_PER_SECOND)) /
      (MS_PER_MINUTE / MS_PER_SECOND),
  );

  const seconds = totalSeconds % (MS_PER_MINUTE / MS_PER_SECOND);

  if (format === "short") {
    const totalHours = Math.floor(totalSeconds / (MS_PER_HOUR / MS_PER_SECOND));
    return [totalHours, minutes, seconds]
      .map((part) => part.toString().padStart(2, "0"))
      .join(":");
  }

  if (days > 0) {
    return format === "compact"
      ? joinCompact([
          [days, "d"],
          [hours, "h"],
        ])
      : joinLong([
          [days, DAY],
          [hours, HOUR],
        ]);
  }

  if (hours > 0) {
    return format === "compact"
      ? joinCompact([
          [hours, "h"],
          [minutes, "m"],
        ])
      : joinLong([
          [hours, HOUR],
          [minutes, MINUTE],
        ]);
  }

  if (minutes > 0) {
    return format === "compact"
      ? joinCompact([
          [minutes, "m"],
          [seconds, "s"],
        ])
      : joinLong([
          [minutes, MINUTE],
          [seconds, SECOND],
        ]);
  }

  return format === "compact" ? `${seconds}s` : joinLong([[seconds, SECOND]]);
}

function joinCompact(parts: Array<[number, string]>): string {
  const shown = parts.filter(([value]) => value > 0);
  if (shown.length === 0) {
    return `0${parts[parts.length - 1][1]}`;
  }

  return shown.map(([value, unit]) => `${value}${unit}`).join(" ");
}

function joinLong(parts: Array<[number, string]>): string {
  const shown = parts.filter(([value]) => value > 0);
  const units = shown.length === 0 ? [parts[parts.length - 1]] : shown;

  return units
    .map(([value, unit]) => `${value} ${unit}${value === 1 ? "" : "s"}`)
    .join(" ");
}
