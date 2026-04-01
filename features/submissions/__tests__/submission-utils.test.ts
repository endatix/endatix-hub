import { describe, expect, it } from "vitest";
import { getMaskedValue, isSensitiveVariableName } from "../submission-utils";

describe("submission-utils", () => {
  describe("isSensitiveVariableName", () => {
    it("should return false for empty string", () => {
      expect(isSensitiveVariableName("")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isSensitiveVariableName(null as any)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isSensitiveVariableName(undefined as any)).toBe(false);
    });

    it("should return true for 'secret' variable", () => {
      expect(isSensitiveVariableName("secret")).toBe(true);
    });

    it("should return true for 'key' variable", () => {
      expect(isSensitiveVariableName("apiKey")).toBe(true);
    });

    it("should return true for 'password' variable", () => {
      expect(isSensitiveVariableName("myPassword")).toBe(true);
    });

    it("should return true for 'token' variable", () => {
      expect(isSensitiveVariableName("authToken")).toBe(true);
    });

    it("should return true for 'pass' variable", () => {
      expect(isSensitiveVariableName("passcode")).toBe(true);
    });

    it("should return true for 'hash' variable", () => {
      expect(isSensitiveVariableName("passwordHash")).toBe(true);
    });

    it("should return true for 'email' variable", () => {
      expect(isSensitiveVariableName("userEmail")).toBe(true);
    });

    it("should return true for 'phone' variable", () => {
      expect(isSensitiveVariableName("phoneNumber")).toBe(true);
    });
    
    it("should return false for non-sensitive variable names", () => {
      expect(isSensitiveVariableName("firstName")).toBe(false);
      expect(isSensitiveVariableName("age")).toBe(false);
      expect(isSensitiveVariableName("address")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isSensitiveVariableName("SECRET")).toBe(true);
      expect(isSensitiveVariableName("PASSWORD")).toBe(true);
      expect(isSensitiveVariableName("Token")).toBe(true);
    });
  });

  describe("getMaskedValue", () => {
    it("should return fixed length masked value", () => {
      const result = getMaskedValue("anyValue");
      expect(result).toBe("••••••••");
      expect(result.length).toBe(8);
    });

    it("should ignore the input value and return consistent mask", () => {
      expect(getMaskedValue("short")).toBe("••••••••");
      expect(getMaskedValue("aVeryLongValueThatShouldBeMasked")).toBe(
        "••••••••",
      );
      expect(getMaskedValue("")).toBe("••••••••");
    });
  });
});
