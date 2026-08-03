import { describe, expect, it } from "vitest";
import {
  formatOrganizationDefaultLabel,
  formatSessionExpiryHours,
  parseSessionExpiryHoursInput,
  sessionExpiryHoursToInput,
} from "../session-expiry-hours";

describe("session-expiry-hours", () => {
  it("formats never-expire and plural hours", () => {
    expect(formatSessionExpiryHours(null)).toBe("Never expires");
    expect(formatSessionExpiryHours(1)).toBe("1 hour");
    expect(formatSessionExpiryHours(24)).toBe("24 hours");
    expect(formatOrganizationDefaultLabel(24)).toBe(
      "Organization default (24 hours)",
    );
  });

  it("parses empty as clear and rejects invalid values", () => {
    expect(parseSessionExpiryHoursInput("")).toEqual({
      ok: true,
      hours: null,
    });
    expect(parseSessionExpiryHoursInput("168")).toEqual({
      ok: true,
      hours: 168,
    });
    expect(parseSessionExpiryHoursInput("0").ok).toBe(false);
    expect(parseSessionExpiryHoursInput("1.5").ok).toBe(false);
    expect(parseSessionExpiryHoursInput("abc").ok).toBe(false);
    expect(parseSessionExpiryHoursInput("-5").ok).toBe(false);
    expect(parseSessionExpiryHoursInput("0x10").ok).toBe(false);
    expect(parseSessionExpiryHoursInput("1e2").ok).toBe(false);
    expect(parseSessionExpiryHoursInput(`1${"0".repeat(400)}`).ok).toBe(false);
    expect(
      parseSessionExpiryHoursInput(String(Number.MAX_SAFE_INTEGER + 1)).ok,
    ).toBe(false);
  });

  it("round-trips input values", () => {
    expect(sessionExpiryHoursToInput(null)).toBe("");
    expect(sessionExpiryHoursToInput(undefined)).toBe("");
    expect(sessionExpiryHoursToInput(7)).toBe("7");
  });
});
