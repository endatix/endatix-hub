import { describe, expect, it } from "vitest";
import {
  RELATIVE_DATE_CUTOFF_DAYS,
  formatCompactDateTime,
  formatDuration,
  formatPreciseDateTime,
  formatRelativeOrCompactDateTime,
  isValidCalendarDateYmd,
  toValidDate,
} from "@/lib/date-utils";

describe("date-utils", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");

  describe("toValidDate", () => {
    it("returns null for missing or invalid values", () => {
      // Arrange & Act & Assert
      expect(toValidDate(null)).toBeNull();
      expect(toValidDate(undefined)).toBeNull();
      expect(toValidDate("")).toBeNull();
      expect(toValidDate("not-a-date")).toBeNull();
    });

    it("parses valid Date and string inputs", () => {
      // Arrange
      const date = new Date("2026-07-21T14:53:00.000Z");

      // Act & Assert
      expect(toValidDate(date)?.getTime()).toBe(date.getTime());
      expect(toValidDate(date.toISOString())?.getTime()).toBe(date.getTime());
    });
  });

  describe("isValidCalendarDateYmd", () => {
    it("accepts real UTC calendar days", () => {
      expect(isValidCalendarDateYmd("2024-01-31")).toBe(true);
      expect(isValidCalendarDateYmd("2024-02-29")).toBe(true);
      expect(isValidCalendarDateYmd("9999-12-31")).toBe(true);
      expect(isValidCalendarDateYmd("0001-01-01")).toBe(true);
    });

    it("rejects overflow dates, wrong shape, and garbage", () => {
      expect(isValidCalendarDateYmd("2024-02-30")).toBe(false);
      expect(isValidCalendarDateYmd("2024-13-01")).toBe(false);
      expect(isValidCalendarDateYmd("01-01-2024")).toBe(false);
      expect(isValidCalendarDateYmd("2024-1-1")).toBe(false);
      expect(isValidCalendarDateYmd("not-a-date")).toBe(false);
      expect(isValidCalendarDateYmd("")).toBe(false);
    });
  });

  describe("formatCompactDateTime", () => {
    it("formats without seconds", () => {
      // Arrange
      const date = new Date("2026-07-21T14:53:59.000Z");

      // Act
      const result = formatCompactDateTime(date);

      // Assert — minutes are present; seconds must not appear as HH:MM:SS
      expect(result).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
      expect(result).toMatch(/Jul/);
      expect(result).toMatch(/21/);
    });

    it("returns fallback for invalid dates", () => {
      // Arrange & Act & Assert
      expect(formatCompactDateTime(null)).toBe("-");
      expect(formatCompactDateTime(undefined, "n/a")).toBe("n/a");
    });
  });

  describe("formatPreciseDateTime", () => {
    it("includes seconds in the output", () => {
      // Arrange
      const date = new Date("2026-07-21T14:53:59.000Z");

      // Act
      const result = formatPreciseDateTime(date);

      // Assert
      expect(result).toMatch(/:\d{2}:\d{2}/);
    });
  });

  describe("formatRelativeOrCompactDateTime", () => {
    it("uses relative time within the cutoff window", () => {
      // Arrange
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Act
      const result = formatRelativeOrCompactDateTime(twoHoursAgo, now);

      // Assert
      expect(result).toMatch(/hour/i);
    });

    it("uses relative time just under the cutoff", () => {
      // Arrange
      const justUnderCutoff = new Date(
        now.getTime() -
          (RELATIVE_DATE_CUTOFF_DAYS * 24 * 60 * 60 * 1000 - 60_000),
      );

      // Act
      const result = formatRelativeOrCompactDateTime(justUnderCutoff, now);

      // Assert
      expect(result).toMatch(/day/i);
      expect(result).not.toMatch(/Jul/);
    });

    it("uses compact absolute at or beyond the cutoff", () => {
      // Arrange
      const atCutoff = new Date(
        now.getTime() - RELATIVE_DATE_CUTOFF_DAYS * 24 * 60 * 60 * 1000,
      );

      // Act
      const result = formatRelativeOrCompactDateTime(atCutoff, now);

      // Assert
      expect(result).toMatch(/Jul|Jun/);
      expect(result).not.toMatch(/ago/i);
    });

    it("returns fallback for invalid dates", () => {
      // Arrange & Act & Assert
      expect(formatRelativeOrCompactDateTime(null, now)).toBe("-");
    });

    it("uses compact absolute when now is omitted (SSR-safe default)", () => {
      // Arrange
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Act
      const result = formatRelativeOrCompactDateTime(twoHoursAgo);

      // Assert
      expect(result).toMatch(/Jul/);
      expect(result).not.toMatch(/hour/i);
    });
  });

  describe("formatDuration", () => {
    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;

    it("rejects a negative or non-finite span", () => {
      // Act & Assert
      expect(formatDuration(-1)).toBe("-");
      expect(formatDuration(Number.NaN)).toBe("-");
      expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("-");
    });

    it("formats zero and sub-minute spans", () => {
      // Act & Assert
      expect(formatDuration(0, "compact")).toBe("0s");
      expect(formatDuration(0, "long")).toBe("0 seconds");
      expect(formatDuration(6 * second, "compact")).toBe("6s");
      expect(formatDuration(6 * second, "long")).toBe("6 seconds");
      expect(formatDuration(1 * second, "long")).toBe("1 second");
    });

    it("keeps seconds under an hour and drops them from an hour up", () => {
      // Act & Assert
      expect(formatDuration(minute + 41 * second, "compact")).toBe("1m 41s");
      expect(formatDuration(12 * minute + 4 * second, "long")).toBe(
        "12 minutes 4 seconds",
      );
      expect(formatDuration(1 * minute, "long")).toBe("1 minute");
      expect(formatDuration(2 * hour + 3 * minute, "compact")).toBe("2h 3m");
      expect(
        formatDuration(5 * hour + 9 * minute + 52 * second, "compact"),
      ).toBe("5h 9m");
      expect(formatDuration(5 * hour + 9 * minute, "long")).toBe(
        "5 hours 9 minutes",
      );
      expect(formatDuration(1 * hour, "long")).toBe("1 hour");
    });

    it("rolls hours into days and drops minutes and seconds", () => {
      // Arrange — 1201h 9m 52s is 50 days and 1 hour
      const span = 1201 * hour + 9 * minute + 52 * second;

      // Act & Assert
      expect(formatDuration(span, "compact")).toBe("50d 1h");
      expect(formatDuration(span, "long")).toBe("50 days 1 hour");
      expect(formatDuration(day, "compact")).toBe("1d");
      expect(formatDuration(day, "long")).toBe("1 day");
      expect(formatDuration(2 * day, "long")).toBe("2 days");
    });

    it("keeps the short clock in total hours", () => {
      // Act & Assert
      expect(formatDuration(5 * second, "short")).toBe("00:00:05");
      expect(
        formatDuration(1201 * hour + 9 * minute + 52 * second, "short"),
      ).toBe("1201:09:52");
    });

    it("floors partial seconds", () => {
      // Act & Assert
      expect(formatDuration(1999, "compact")).toBe("1s");
    });
  });
});
