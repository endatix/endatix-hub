import { describe, it, expect, vi, beforeEach } from "vitest";
import { FormTokenCookieStore, DEFAULT_COOKIE_NAME, DEFAULT_COOKIE_DURATION } from "../cookie-store";
import { Result } from "@/lib/result";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

describe("FormTokenCookieStore", () => {
  // Mock with proper typing
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const COOKIE_NAME = "TEST_COOKIE";
  const TEST_FORM_ID = "form-1";
  const TEST_TOKEN = "token-1";

  // Helper function to create a store with standard test config
  function createStore() {
    return new FormTokenCookieStore(
      mockCookieStore as unknown as ReadonlyRequestCookies,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_FORMS_COOKIE_NAME = COOKIE_NAME;
    process.env.NEXT_FORMS_COOKIE_DURATION_DAYS = "7";
  });

  describe("initialization", () => {
    it("creates a store instance when environment variables are set", () => {
      const store = createStore();
      expect(store).toBeDefined();
    });

    it("falls back to default cookie name when environment variable is not set", () => {
      delete process.env.NEXT_FORMS_COOKIE_NAME;
      const store = createStore();
      expect(store.getCookieName()).toBe(DEFAULT_COOKIE_NAME);
    });

    it("falls back to default cookie duration when environment variable is not set", () => {
      delete process.env.NEXT_FORMS_COOKIE_DURATION_DAYS;
      const store = createStore();
      expect(store.getCookieDuration()).toBe(DEFAULT_COOKIE_DURATION);
    });

    it("throws error when cookie duration environment variable is invalid", () => {
      process.env.NEXT_FORMS_COOKIE_DURATION_DAYS = "not-a-number";
      expect(() => createStore()).toThrow(
        'Cookie duration "not-a-number" is not a valid number',
      );
    });
  });

  describe("getToken", () => {
    it("returns success with token when form ID exists in cookie", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({ [TEST_FORM_ID]: TEST_TOKEN }),
      });

      // Act
      const result = store.getToken(TEST_FORM_ID);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value).toBe(TEST_TOKEN);
      }
    });

    it("returns error when cookie exists but form ID is not found", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({}),
      });

      // Act
      const result = store.getToken("non-existent");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("No token found for the current form");
      }
    });

    it("returns error when form ID parameter is empty", () => {
      // Arrange
      const store = createStore();

      // Act
      const result = store.getToken("");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("FormId is required");
      }
    });

    it("returns error when cookie JSON is invalid", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue({
        value: "invalid-json",
      });

      // Act
      const result = store.getToken(TEST_FORM_ID);

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toContain("Error parsing cookie");
      }
    });
  });

  describe("setToken", () => {
    it("adds new token when cookie exists with other tokens", () => {
      // Arrange
      const store = createStore();
      const existingTokens = { "existing-form": "existing-token" };
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify(existingTokens),
      });

      // Act
      const result = store.setToken({
        formId: TEST_FORM_ID,
        token: TEST_TOKEN,
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);

      // Verify cookie was set with combined tokens
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        JSON.stringify({
          "existing-form": "existing-token",
          [TEST_FORM_ID]: TEST_TOKEN,
        }),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
        }),
      );
    });

    it("creates new cookie when no cookie exists", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue(undefined);

      // Act
      const result = store.setToken({
        formId: TEST_FORM_ID,
        token: TEST_TOKEN,
      });

      // Assert
      expect(Result.isSuccess(result)).toBe(true);

      // Verify new cookie was set
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        JSON.stringify({ [TEST_FORM_ID]: TEST_TOKEN }),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "strict",
        }),
      );
    });

    it("returns error when form ID is missing", () => {
      // Arrange
      const store = createStore();

      // Act
      const result = store.setToken({ formId: "", token: TEST_TOKEN });

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("FormId and token are required");
      }
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });

  describe("deleteToken", () => {
    it("removes specific token while preserving others", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({
          [TEST_FORM_ID]: TEST_TOKEN,
          "form-2": "token-2",
        }),
      });

      // Act
      const result = store.deleteToken(TEST_FORM_ID);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);

      // Verify cookie updated with remaining tokens
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        JSON.stringify({ "form-2": "token-2" }),
        expect.any(Object),
      );
    });

    it("removes cookie entirely when deleting the last token", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({ [TEST_FORM_ID]: TEST_TOKEN }),
      });

      // Act
      const result = store.deleteToken(TEST_FORM_ID);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);

      // Verify cookie was set with empty value and maxAge: 0
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        COOKIE_NAME,
        "",
        expect.objectContaining({
          maxAge: 0,
        }),
      );
    });

    it("succeeds when token is not found", () => {
      // Arrange
      const store = createStore();
      mockCookieStore.get.mockReturnValue({
        value: JSON.stringify({ "other-form": "other-token" }),
      });

      // Act
      const result = store.deleteToken(TEST_FORM_ID);

      // Assert
      expect(Result.isSuccess(result)).toBe(true);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it("returns error when form ID is missing", () => {
      // Arrange
      const store = createStore();

      // Act
      const result = store.deleteToken("");

      // Assert
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.message).toBe("FormId is required");
      }
    });
  });
});
