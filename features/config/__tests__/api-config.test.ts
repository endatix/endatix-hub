/**
 * Tests for API configuration and URL normalization logic
 */

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  normalizeApiPrefix,
  constructApiUrl,
  getApiConfig,
  requireApiUrl,
  ensureResolvedApiUrl,
  resetApiConfigCacheForTests,
  API_ORIGIN_ENV_TIP,
} from "../api-config";

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
      const apiUrl = constructApiUrl(
        "https://api.example.com",
        "endatix/api/v1/",
      );
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

describe("getApiConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetApiConfigCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;
  });

  afterEach(() => {
    resetApiConfigCacheForTests();
    process.env = { ...originalEnv };
  });

  test("returns null when neither ENDATIX_BASE_URL nor ENDATIX_API_URL is set", () => {
    expect(getApiConfig()).toBeNull();
  });

  test("constructs apiUrl from ENDATIX_BASE_URL and default prefix", () => {
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    expect(getApiConfig()?.apiUrl).toBe("https://api.example.com/api");
  });

  test("falls back to ENDATIX_API_URL when ENDATIX_BASE_URL is unset", () => {
    process.env.ENDATIX_API_URL = "https://helm.example.com/api";
    const config = getApiConfig();
    expect(config?.apiUrl).toBe("https://helm.example.com/api");
    expect(config?.baseUrl).toBe("https://helm.example.com");
    expect(config?.prefix).toBe("/api");
  });

  test("returns null when ENDATIX_API_URL is not a valid URL", () => {
    process.env.ENDATIX_API_URL = "not-a-url";
    expect(getApiConfig()).toBeNull();
  });

  test("returns null when ENDATIX_API_URL uses an unsupported protocol", () => {
    process.env.ENDATIX_API_URL = "ftp://api.example.com/api";
    expect(getApiConfig()).toBeNull();

    resetApiConfigCacheForTests();
    process.env.ENDATIX_API_URL = "file:///tmp/api";
    expect(getApiConfig()).toBeNull();
  });

  test("accepts ENDATIX_API_URL with http or https", () => {
    process.env.ENDATIX_API_URL = "http://api.example.com/api";
    expect(getApiConfig()?.apiUrl).toBe("http://api.example.com/api");

    resetApiConfigCacheForTests();
    delete process.env.ENDATIX_API_URL;
    process.env.ENDATIX_API_URL = "https://api.example.com/api";
    expect(getApiConfig()?.apiUrl).toBe("https://api.example.com/api");
  });

  test("returns null when ENDATIX_BASE_URL is not a valid URL", () => {
    process.env.ENDATIX_BASE_URL = "not-a-url";
    expect(getApiConfig()).toBeNull();
  });

  test("strips a trailing slash from ENDATIX_API_URL pathname", () => {
    process.env.ENDATIX_API_URL = "https://helm.example.com/api/";
    const config = getApiConfig();
    expect(config?.prefix).toBe("/api");
    expect(config?.apiUrl).toBe("https://helm.example.com/api");
    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe("requireApiUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetApiConfigCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;
  });

  afterEach(() => {
    resetApiConfigCacheForTests();
    process.env = { ...originalEnv };
  });

  test("returns the resolved apiUrl when configured", () => {
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    expect(requireApiUrl()).toBe("https://api.example.com/api");
  });

  test("throws when neither origin env var resolves", () => {
    expect(() => requireApiUrl()).toThrow(API_ORIGIN_ENV_TIP);
  });
});

describe("ensureResolvedApiUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetApiConfigCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.ENDATIX_BASE_URL;
    delete process.env.ENDATIX_API_URL;
    delete process.env.ENDATIX_API_PREFIX;
  });

  afterEach(() => {
    resetApiConfigCacheForTests();
    process.env = { ...originalEnv };
  });

  test("returns null when neither origin env var is set", () => {
    expect(ensureResolvedApiUrl()).toBeNull();
  });

  test("accepts ENDATIX_API_URL alone and leaves it in place", () => {
    process.env.ENDATIX_API_URL = "https://helm.example.com/api";
    const config = ensureResolvedApiUrl();
    expect(config?.apiUrl).toBe("https://helm.example.com/api");
    expect(process.env.ENDATIX_API_URL).toBe("https://helm.example.com/api");
  });

  test("hydrates ENDATIX_API_URL from ENDATIX_BASE_URL when API URL is unset", () => {
    process.env.ENDATIX_BASE_URL = "https://api.example.com";
    const config = ensureResolvedApiUrl();
    expect(config?.apiUrl).toBe("https://api.example.com/api");
    expect(process.env.ENDATIX_API_URL).toBe("https://api.example.com/api");
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
