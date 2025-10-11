/**
 * Tests for API configuration and URL normalization logic
 */

import { describe, expect, test } from "vitest";
import { normalizeApiPrefix, constructApiUrl } from "../api-config";

describe("API Configuration", () => {
  describe("URL Normalization", () => {
    test("should normalize various API prefix formats", () => {
      // Test cases for different input formats
      const testCases = [
        { input: "api", expected: "/api" },
        { input: "/api", expected: "/api" },
        { input: "api/", expected: "/api" },
        { input: "/api/", expected: "/api" },
        { input: "  api  ", expected: "/api" },
        { input: "  /api  ", expected: "/api" },
        { input: "  api/  ", expected: "/api" },
        { input: "  /api/  ", expected: "/api" },
        { input: "/v1/api", expected: "/v1/api" },
        { input: "v1/api", expected: "/v1/api" },
        { input: "/v1/api/", expected: "/v1/api" },
        { input: "v1/api/", expected: "/v1/api" },
        { input: "/", expected: "" },
        { input: "  /  ", expected: "" },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeApiPrefix(input)).toBe(expected);
      });
    });

    test("should handle edge cases", () => {
      expect(normalizeApiPrefix("")).toBe("");
      expect(normalizeApiPrefix("   ")).toBe("");
      expect(normalizeApiPrefix("/")).toBe("");
      expect(normalizeApiPrefix("///")).toBe("//"); // Only last slash is removed
      expect(normalizeApiPrefix("/api/")).toBe("/api");
    });
  });

  describe("API URL Construction", () => {
    test("should construct correct URL with default prefix", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "/api");
      expect(apiUrl).toBe("https://api.example.com/api");
    });

    test("should construct correct URL with custom prefix", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "/v1/api");
      expect(apiUrl).toBe("https://api.example.com/v1/api");
    });

    test("should normalize API prefix correctly", () => {
      const testCases = [
        { prefix: "api", expected: "https://api.example.com/api" },
        { prefix: "/api", expected: "https://api.example.com/api" },
        { prefix: "api/", expected: "https://api.example.com/api" },
        { prefix: "/api/", expected: "https://api.example.com/api" },
        { prefix: "  api  ", expected: "https://api.example.com/api" },
        { prefix: "v1/api", expected: "https://api.example.com/v1/api" },
        { prefix: "/v1/api/", expected: "https://api.example.com/v1/api" },
        { prefix: "/", expected: "https://api.example.com" },
      ];

      testCases.forEach(({ prefix, expected }) => {
        const apiUrl = constructApiUrl("https://api.example.com", prefix);
        expect(apiUrl).toBe(expected);
      });
    });

    test("should handle base URL with trailing slash", () => {
      const apiUrl = constructApiUrl("https://api.example.com/", "/api");
      expect(apiUrl).toBe("https://api.example.com/api");
    });

    test("should handle base URL without trailing slash", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "/api");
      expect(apiUrl).toBe("https://api.example.com/api");
    });

    test("should handle localhost URLs", () => {
      const apiUrl = constructApiUrl("http://localhost:5001", "/api");
      expect(apiUrl).toBe("http://localhost:5001/api");
    });

    test("should handle URLs with ports", () => {
      const apiUrl = constructApiUrl("https://api.example.com:8080", "/v2/api");
      expect(apiUrl).toBe("https://api.example.com:8080/v2/api");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty API prefix", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "");
      expect(apiUrl).toBe("https://api.example.com");
    });

    test("should handle whitespace-only API prefix", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "   ");
      expect(apiUrl).toBe("https://api.example.com");
    });

    test("should handle root path API prefix", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "/");
      expect(apiUrl).toBe("https://api.example.com");
    });

    test("should handle complex API paths", () => {
      const apiUrl = constructApiUrl(
        "https://api.example.com",
        "/api/v1/forms",
      );
      expect(apiUrl).toBe("https://api.example.com/api/v1/forms");
    });

    test("should handle API prefix with multiple segments and trailing slash", () => {
      const apiUrl = constructApiUrl("https://api.example.com", "endatix/api/v1/");
      expect(apiUrl).toBe("https://api.example.com/endatix/api/v1");
    });
  });

  describe("URL Validation", () => {
    test("should validate constructed URLs are valid", () => {
      const validUrls = [
        "https://api.example.com/api",
        "http://localhost:3000/api",
        "https://subdomain.example.com:8080/v1/api",
        "https://api.example.com",
      ];

      validUrls.forEach((baseUrl) => {
        const apiUrl = constructApiUrl(baseUrl, "/api");
        expect(() => new URL(apiUrl)).not.toThrow();
      });
    });

    test("should reject invalid URLs", () => {
      const invalidUrls = [
        "not-a-url",
        "https://",
        "http://",
        "just-text",
        "://missing-protocol",
      ];

      invalidUrls.forEach((baseUrl) => {
        expect(() => new URL(baseUrl)).toThrow();
      });
    });
  });
});

describe("Integration Tests", () => {
  test("should work with typical production configuration", () => {
    const apiUrl = constructApiUrl("https://api.endatix.com", "/api");
    expect(apiUrl).toBe("https://api.endatix.com/api");
  });

  test("should work with development configuration", () => {
    const apiUrl = constructApiUrl("http://localhost:5001", "/api");
    expect(apiUrl).toBe("http://localhost:5001/api");
  });

  test("should work with versioned API configuration", () => {
    const apiUrl = constructApiUrl("https://api.endatix.com", "/v2/api");
    expect(apiUrl).toBe("https://api.endatix.com/v2/api");
  });
});
