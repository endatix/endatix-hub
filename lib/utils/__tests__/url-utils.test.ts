import { describe, it, expect } from "vitest";
import { extractHostname, toSafeRelativeUrl } from "../url-utils";
import { Result } from "../../result";

const BASE_ORIGIN = "https://example.com";
const DEFAULT_RETURN_PATH = "/forms";

describe("toSafeRelativeUrl", () => {
  it("returns path + search for normal paths", () => {
    expect(
      toSafeRelativeUrl("/forms", "", BASE_ORIGIN, DEFAULT_RETURN_PATH),
    ).toBe("/forms");
    expect(
      toSafeRelativeUrl(
        "/forms",
        "tab=submissions",
        BASE_ORIGIN,
        DEFAULT_RETURN_PATH,
      ),
    ).toBe("/forms?tab=submissions");
    expect(
      toSafeRelativeUrl("/settings", "?a=1", BASE_ORIGIN, DEFAULT_RETURN_PATH),
    ).toBe("/settings?a=1");
  });

  it("returns defaultPath when pathname is / or empty", () => {
    expect(toSafeRelativeUrl("/", "", BASE_ORIGIN, DEFAULT_RETURN_PATH)).toBe(
      DEFAULT_RETURN_PATH,
    );
    expect(toSafeRelativeUrl("", "", BASE_ORIGIN, DEFAULT_RETURN_PATH)).toBe(
      DEFAULT_RETURN_PATH,
    );
  });

  it("returns defaultPath for protocol-relative (//) to prevent open redirect", () => {
    expect(
      toSafeRelativeUrl("//evil.com", "", BASE_ORIGIN, DEFAULT_RETURN_PATH),
    ).toBe(DEFAULT_RETURN_PATH);
    expect(
      toSafeRelativeUrl(
        "//evil.com/path",
        "",
        BASE_ORIGIN,
        DEFAULT_RETURN_PATH,
      ),
    ).toBe(DEFAULT_RETURN_PATH);
  });

  it("returns defaultPath when path or search contains //", () => {
    expect(
      toSafeRelativeUrl("/forms//foo", "", BASE_ORIGIN, DEFAULT_RETURN_PATH),
    ).toBe(DEFAULT_RETURN_PATH);
    expect(
      toSafeRelativeUrl(
        "/forms",
        "x=//evil.com",
        BASE_ORIGIN,
        DEFAULT_RETURN_PATH,
      ),
    ).toBe(DEFAULT_RETURN_PATH);
  });

  it("returns path when path has encoded segments", () => {
    expect(
      toSafeRelativeUrl(
        "/forms/abc%2F123",
        "",
        BASE_ORIGIN,
        DEFAULT_RETURN_PATH,
      ),
    ).toBe("/forms/abc%2F123");
  });
});

describe("extractHostname", () => {
  describe("successful extraction", () => {
    it("should extract hostname from URL with https:// protocol", () => {
      // Arrange
      const urlString = "https://cdn.example.com";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from URL with http:// protocol", () => {
      // Arrange
      const urlString = "http://cdn.example.com";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from URL with path", () => {
      // Arrange
      const urlString = "https://cdn.example.com/path/to/resource";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from URL with query parameters", () => {
      // Arrange
      const urlString = "https://cdn.example.com?param=value";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from URL with port", () => {
      // Arrange
      const urlString = "https://cdn.example.com:443";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from URL with port and path", () => {
      // Arrange
      const urlString = "https://cdn.example.com:8080/api/v1";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from plain hostname string (no protocol)", () => {
      // Arrange
      const urlString = "cdn.example.com";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from hostname with path (no protocol)", () => {
      // Arrange
      const urlString = "cdn.example.com/path/to/resource";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from hostname with port (no protocol)", () => {
      // Arrange
      const urlString = "cdn.example.com:8080";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });

    it("should extract hostname from Azure blob storage URL", () => {
      // Arrange
      const urlString = "https://myaccount.blob.core.windows.net";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("myaccount.blob.core.windows.net");
      }
    });

    it("should extract hostname from subdomain", () => {
      // Arrange
      const urlString = "https://subdomain.example.com";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("subdomain.example.com");
      }
    });

    it("should extract hostname from URL with hash", () => {
      // Arrange
      const urlString = "https://cdn.example.com/path#section";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe("cdn.example.com");
      }
    });
  });

  describe("error cases", () => {
    it("should return validation error for empty string", () => {
      // Arrange
      const urlString = "";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        // Empty string is falsy, so it's caught by the first check
        expect(result.message).toBe(
          "URL string is required to extract hostname",
        );
      }
    });

    it("should return validation error for null", () => {
      // Arrange
      const urlString = null as unknown as string;

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "URL string is required to extract hostname",
        );
      }
    });

    it("should return validation error for undefined", () => {
      // Arrange
      const urlString = undefined as unknown as string;

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe(
          "URL string is required to extract hostname",
        );
      }
    });

    it("should return validation error for invalid URL with spaces", () => {
      // Arrange
      const urlString = "https://invalid url";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Invalid URL string to extract hostname");
      }
    });

    it("should return validation error for invalid URL format", () => {
      // Arrange
      const urlString = "not a valid url://";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Invalid URL string to extract hostname");
      }
    });

    it("should return validation error for malformed protocol", () => {
      // Arrange
      const urlString = "ht tp://example.com";

      // Act
      const result = extractHostname(urlString);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("Invalid URL string to extract hostname");
      }
    });
  });
});
