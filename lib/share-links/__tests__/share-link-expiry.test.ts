import { describe, expect, it } from "vitest";
import {
  clampExpiryMinutes,
  DEFAULT_EXPIRY_MINUTES,
  EXPIRY_OPTIONS,
  formatExpiresIn,
  MAX_EXPIRY_MINUTES,
} from "../share-link-expiry";

describe("EXPIRY_OPTIONS", () => {
  /** The API rejects anything above its own maximum with an opaque 400. */
  it("offers nothing the API would refuse", () => {
    for (const option of EXPIRY_OPTIONS) {
      expect(option.value).toBeGreaterThanOrEqual(1);
      expect(option.value).toBeLessThanOrEqual(MAX_EXPIRY_MINUTES);
    }
  });

  it("keeps the current 7-day behaviour as the default", () => {
    expect(EXPIRY_OPTIONS.some((o) => o.value === DEFAULT_EXPIRY_MINUTES)).toBe(
      true,
    );
    expect(DEFAULT_EXPIRY_MINUTES).toBe(10_080);
  });
});

describe("clampExpiryMinutes", () => {
  it.each([
    [60, 60],
    [MAX_EXPIRY_MINUTES, MAX_EXPIRY_MINUTES],
    [MAX_EXPIRY_MINUTES + 1, MAX_EXPIRY_MINUTES],
    [999_999, MAX_EXPIRY_MINUTES],
    [0, 1],
    [-5, 1],
    [10.9, 10],
  ])("clamps %p to %p", (input, expected) => {
    expect(clampExpiryMinutes(input)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "falls back to the default for %p",
    (input) => {
      expect(clampExpiryMinutes(input)).toBe(DEFAULT_EXPIRY_MINUTES);
    },
  );
});

describe("formatExpiresIn", () => {
  const now = new Date("2026-09-16T12:00:00Z");

  it.each([
    ["2026-09-23T12:00:00Z", "Expires in 7 days"],
    ["2026-09-17T12:00:00Z", "Expires in 1 day"],
    ["2026-09-16T15:00:00Z", "Expires in 3 hours"],
    ["2026-09-16T13:00:00Z", "Expires in 1 hour"],
    ["2026-09-16T12:30:00Z", "Expires in 30 minutes"],
  ])("renders %p as %p", (expiresAt, expected) => {
    expect(formatExpiresIn(expiresAt, now)).toBe(expected);
  });

  it("reports an elapsed link as expired", () => {
    expect(formatExpiresIn("2026-09-16T11:00:00Z", now)).toBe("Expired");
  });

  it("does not throw on a malformed date", () => {
    expect(formatExpiresIn("not-a-date", now)).toBe("Expiry unknown");
  });
});
