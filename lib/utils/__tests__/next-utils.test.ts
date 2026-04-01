import { describe, expect, it } from "vitest";
import { getOsClass } from "../next-utils";

const createMockHeaders = (
  userAgent: string,
): { get: (key: string) => string | null } => ({
  get: (key: string) => (key === "user-agent" ? userAgent : null),
});

describe("next-utils", () => {
  describe("getOsClass", () => {
    it("should return os-macos for Mac OS user agents", () => {
      const headers = createMockHeaders(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      );
      expect(getOsClass(headers as any)).toBe("os-macos");
    });

    it("should return os-macos for iPhone user agents", () => {
      const headers = createMockHeaders(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      );
      expect(getOsClass(headers as any)).toBe("os-macos");
    });

    it("should return os-macos for iPad user agents", () => {
      const headers = createMockHeaders(
        "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
      );
      expect(getOsClass(headers as any)).toBe("os-macos");
    });

    it("should return os-macos for iPod user agents", () => {
      const headers = createMockHeaders(
        "Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X)",
      );
      expect(getOsClass(headers as any)).toBe("os-macos");
    });

    it("should return empty string for Windows user agents", () => {
      const headers = createMockHeaders(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      );
      expect(getOsClass(headers as any)).toBe("");
    });

    it("should return empty string for Linux user agents", () => {
      const headers = createMockHeaders("Mozilla/5.0 (X11; Linux x86_64)");
      expect(getOsClass(headers as any)).toBe("");
    });

    it("should return empty string for Android user agents", () => {
      const headers = createMockHeaders("Mozilla/5.0 (Linux; Android 11)");
      expect(getOsClass(headers as any)).toBe("");
    });

    it("should return empty string for empty user agent", () => {
      const headers = createMockHeaders("");
      expect(getOsClass(headers as any)).toBe("");
    });

    it("should return empty string when user-agent is null", () => {
      const headers = { get: () => null };
      expect(getOsClass(headers as any)).toBe("");
    });
  });
});
