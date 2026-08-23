import { describe, expect, it } from "vitest";
import { isValidAbsoluteUrl } from "../is-valid-absolute-url";

describe("isValidAbsoluteUrl", () => {
  describe("valid absolute URLs", () => {
    it("returns true for https URLs", () => {
      expect(isValidAbsoluteUrl("https://example.com")).toBe(true);
      expect(isValidAbsoluteUrl("https://example.com/path")).toBe(true);
      expect(isValidAbsoluteUrl("https://example.com/path?query=value")).toBe(
        true,
      );
    });

    it("returns true for http URLs", () => {
      expect(isValidAbsoluteUrl("http://example.com")).toBe(true);
      expect(isValidAbsoluteUrl("http://example.com/path")).toBe(true);
    });

    it("returns true for localhost and ports", () => {
      expect(isValidAbsoluteUrl("http://localhost:5001")).toBe(true);
      expect(isValidAbsoluteUrl("http://endatix-api:8080/api")).toBe(true);
    });

    it("trims surrounding whitespace before validating", () => {
      expect(isValidAbsoluteUrl("  https://example.com/api  ")).toBe(true);
    });
  });

  describe("rejected URLs", () => {
    it("returns false for javascript: protocol", () => {
      expect(isValidAbsoluteUrl("javascript:alert(1)")).toBe(false);
      expect(isValidAbsoluteUrl("javascript:alert('xss')")).toBe(false);
      expect(isValidAbsoluteUrl("javascript:void(0)")).toBe(false);
    });

    it("returns false for data: protocol", () => {
      expect(
        isValidAbsoluteUrl("data:text/html,<script>alert(1)</script>"),
      ).toBe(false);
      expect(isValidAbsoluteUrl("data:,Hello%2C%20World!")).toBe(false);
    });

    it("returns false for vbscript: protocol", () => {
      expect(isValidAbsoluteUrl("vbscript:msgbox('xss')")).toBe(false);
    });

    it("returns false for file: and ftp:", () => {
      expect(isValidAbsoluteUrl("file:///etc/passwd")).toBe(false);
      expect(isValidAbsoluteUrl("ftp://example.com")).toBe(false);
    });

    it("returns false for mailto: and tel:", () => {
      expect(isValidAbsoluteUrl("mailto:admin@example.com")).toBe(false);
      expect(isValidAbsoluteUrl("tel:+1234567890")).toBe(false);
    });

    it("returns false for empty, null, undefined, and whitespace", () => {
      expect(isValidAbsoluteUrl("")).toBe(false);
      expect(isValidAbsoluteUrl(null as unknown as string)).toBe(false);
      expect(isValidAbsoluteUrl(undefined as unknown as string)).toBe(false);
      expect(isValidAbsoluteUrl("   ")).toBe(false);
    });

    it("returns false for protocol-relative URLs", () => {
      expect(isValidAbsoluteUrl("//evil.com")).toBe(false);
    });

    it("returns false for unknown schemes", () => {
      expect(isValidAbsoluteUrl("hack://example.com")).toBe(false);
      expect(isValidAbsoluteUrl("fake://malicious.com")).toBe(false);
    });

    it("returns false for relative URLs", () => {
      expect(isValidAbsoluteUrl("/path")).toBe(false);
      expect(isValidAbsoluteUrl("/path?query=value")).toBe(false);
    });

    it("returns false for malformed absolute URLs", () => {
      expect(isValidAbsoluteUrl("not-a-url")).toBe(false);
      expect(isValidAbsoluteUrl("https://")).toBe(false);
    });
  });
});
