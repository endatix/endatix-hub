import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import posthog from "posthog-js";
import {
  initPostHog,
  isPostHogInitialized,
  ensureReady,
} from "../client/client";
import type { PostHogConfig, PostHogClientOptions } from "../shared/types";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    __loaded: false,
  },
}));

describe("PostHog Client", () => {
  const mockConfig: PostHogConfig = {
    apiKey: "test-api-key",
    apiHost: "https://test.posthog.com",
    uiHost: "https://app.posthog.com",
    enabled: true,
    debug: false,
  };

  const mockOptions: Partial<PostHogClientOptions> = {
    capturePageview: false,
    disableSessionRecording: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mocked(posthog).__loaded = false;

    if (typeof window === "undefined") {
      // @ts-expect-error: simulating window
      global.window = {};
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("isPostHogInitialized", () => {
    it("should return true when PostHog is initialized", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;

      // Act
      const result = isPostHogInitialized();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when PostHog is not initialized", () => {
      // Arrange
      vi.mocked(posthog).__loaded = false;

      // Act
      const result = isPostHogInitialized();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("initPostHog", () => {
    it("should handle initialization errors gracefully", () => {
      // Arrange
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(posthog.init).mockImplementationOnce(() => {
        throw new Error("Initialization error");
      });

      // Act
      const result = initPostHog(mockConfig, { ...mockOptions });

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[PostHog] Failed to initialize:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should initialize PostHog with the correct config", () => {
      // Act
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(true);
      expect(posthog.init).toHaveBeenCalledWith(
        mockConfig.apiKey,
        expect.objectContaining({
          api_host: mockConfig.apiHost,
          ui_host: mockConfig.uiHost,
          capture_pageview: mockOptions.capturePageview,
          disable_session_recording: mockOptions.disableSessionRecording,
        }),
      );
    });

    it("should not initialize when PostHog is disabled", () => {
      // Arrange
      const disabledConfig = { ...mockConfig, enabled: false };

      // Act
      const result = initPostHog(disabledConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it("should not initialize when in a non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should not reinitialize when already initialized", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;

      // Act
      const result = initPostHog(mockConfig, mockOptions);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();
    });
  });

  describe("ensureReady", () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it("should return true when PostHog is already initialized", () => {
      // Arrange
      vi.mocked(posthog).__loaded = true;

      // Act
      const result = ensureReady(mockConfig);

      // Assert
      expect(result).toBe(true);
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it("should initialize PostHog when not initialized", () => {
      // Arrange
      vi.mocked(posthog).__loaded = false;
      vi.mocked(posthog.init).mockImplementationOnce(() => {
        vi.mocked(posthog).__loaded = true;
        return posthog;
      });

      // Act
      const result = ensureReady(mockConfig);

      // Assert
      expect(result).toBe(true);
      expect(posthog.init).toHaveBeenCalled();
    });

    it("should return false when no config is provided", () => {
      // Act
      const result = ensureReady(undefined);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[PostHog] Can't perform operation: No configuration provided",
      );
    });

    it("should return false in non-browser environment", () => {
      // Arrange
      const originalWindow = global.window;
      // @ts-expect-error: simulating non-browser
      delete global.window;

      // Act
      const result = ensureReady(mockConfig);

      // Assert
      expect(result).toBe(false);
      expect(posthog.init).not.toHaveBeenCalled();

      // Cleanup
      global.window = originalWindow;
    });

    it("should include operation context in warning message", () => {
      // Act
      ensureReady(undefined, undefined, {
        operation: "check feature",
        identifier: "test-feature",
      });

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[PostHog] Can't check feature \"test-feature\": No configuration provided",
      );
    });
  });
});
