import { describe, expect, it } from "vitest";
import {
  RELATIVE_DATE_CUTOFF_DAYS,
  formatCompactDateTime,
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
});
