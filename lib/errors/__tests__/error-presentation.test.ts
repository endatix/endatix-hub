import { describe, expect, it } from "vitest";
import {
  resolveErrorPresentation,
  type ErrorPresentation,
} from "@/lib/errors/error-presentation";

const EXPIRED: ErrorPresentation = {
  code: "401",
  eyebrow: "Link expired",
  title: "This link has expired.",
  message: "Request a new access link to continue.",
};

const FALLBACK: ErrorPresentation = {
  code: "500",
  eyebrow: "Unexpected error",
  title: "Something went wrong.",
  message: "Try again.",
};

const MAP: Record<string, ErrorPresentation> = { token_expired: EXPIRED };

describe("resolveErrorPresentation", () => {
  it("returns the mapped presentation for a known key", () => {
    // Arrange & Act
    const resolved = resolveErrorPresentation(MAP, "token_expired", FALLBACK);

    // Assert
    expect(resolved).toBe(EXPIRED);
  });

  it.each([
    ["an unknown key", "no_such_code"],
    ["no key at all", undefined],
  ])("falls back for %s", (_name, key) => {
    // Arrange & Act
    const resolved = resolveErrorPresentation(MAP, key, FALLBACK);

    // Assert
    expect(resolved).toBe(FALLBACK);
  });

  /**
   * The map is indexed by a caller-supplied string, so a key that happens to name an
   * Object.prototype member must not resolve to a function instead of a presentation.
   */
  it("falls back for inherited object keys", () => {
    // Arrange & Act
    const resolved = resolveErrorPresentation(MAP, "toString", FALLBACK);

    // Assert
    expect(resolved).toBe(FALLBACK);
  });
});
