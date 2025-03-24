import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PostHogProvider } from "../client/provider";
import { initPostHog, isPostHogInitialized } from "../client/client";
import { createPostHogConfig, isPostHogEnabled } from "../shared/config";
import type { SessionData } from "@/features/auth";

// Mock dependencies
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    __loaded: false,
    isFeatureEnabled: vi.fn(),
    capture: vi.fn(),
  },
}));

vi.mock("../client/client", () => ({
  initPostHog: vi.fn(),
  isPostHogInitialized: vi.fn(),
}));

vi.mock("../shared/config", () => ({
  createPostHogConfig: vi.fn(),
  isPostHogEnabled: vi.fn(),
  isDebugMode: vi.fn().mockReturnValue(false),
}));

vi.mock("../client/pageview", () => ({
  PostHogPageView: () => <div data-testid="pageview-component">PageView</div>,
}));

vi.mock("../client/user-identity", () => ({
  PostHogUserIdentity: ({ session }: { session?: SessionData }) => (
    <div data-testid="user-identity-component">
      UserIdentity: {session?.username || "anonymous"}
    </div>
  ),
}));

describe("PostHogProvider", () => {
  const mockConfig = {
    apiKey: "test-api-key",
    apiHost: "https://test.posthog.com",
    uiHost: "https://app.posthog.com",
    enabled: true,
    debug: false,
  };

  const mockSession: SessionData = {
    username: "test@example.com",
    accessToken: "test-token",
    refreshToken: "refresh-token",
    isLoggedIn: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPostHogConfig).mockReturnValue(mockConfig);
    vi.mocked(isPostHogEnabled).mockReturnValue(true);
    vi.mocked(initPostHog).mockReturnValue(true);
    vi.mocked(isPostHogInitialized).mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize PostHog when analytics is enabled", async () => {
    // Arrange & Act
    render(
      <PostHogProvider>
        <div data-testid="child">Test Child</div>
      </PostHogProvider>,
    );

    // Assert
    await waitFor(() => {
      expect(createPostHogConfig).toHaveBeenCalled();
    });

    expect(isPostHogEnabled).toHaveBeenCalledWith(mockConfig);
    expect(initPostHog).toHaveBeenCalledWith(
      mockConfig,
      expect.objectContaining({
        capturePageview: false,
        disableSessionRecording: false,
      }),
    );
  });

  it("should render children and PostHog components when analytics is enabled", () => {
    // Arrange & Act
    render(
      <PostHogProvider>
        <div data-testid="child">Test Child</div>
      </PostHogProvider>,
    );

    // Assert
    expect(screen.getByTestId("child")).toBeDefined();
    expect(screen.getByTestId("pageview-component")).toBeDefined();
    expect(screen.getByTestId("user-identity-component")).toBeDefined();
  });

  it("should render children only when analytics is disabled", () => {
    // Arrange
    vi.mocked(isPostHogEnabled).mockReturnValue(false);

    // Act
    render(
      <PostHogProvider>
        <div data-testid="child">Test Child</div>
      </PostHogProvider>,
    );

    // Assert
    expect(screen.getByTestId("child")).toBeDefined();
    expect(screen.queryByTestId("pageview-component")).toBeNull();
    expect(screen.queryByTestId("user-identity-component")).toBeNull();
    expect(initPostHog).not.toHaveBeenCalled();
  });

  it("should pass session to UserIdentity component", () => {
    // Arrange & Act
    render(
      <PostHogProvider session={mockSession}>
        <div data-testid="child">Test Child</div>
      </PostHogProvider>,
    );

    // Assert
    const userIdentityElement = screen.getByTestId("user-identity-component");
    expect(userIdentityElement.textContent).toContain(
      `UserIdentity: ${mockSession.username}`,
    );
  });

  it("should handle errors during PostHog initialization", async () => {
    // Arrange
    vi.mocked(initPostHog).mockImplementation(() => {
      throw new Error("Initialization error");
    });

    // Act & Assert (should not throw)
    expect(() => {
      render(
        <PostHogProvider>
          <div data-testid="child">Test Child</div>
        </PostHogProvider>,
      );
    }).not.toThrow();

    // Child should still be rendered
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("should not reinitialize PostHog when deps change but PostHog is already initialized", async () => {
    // Arrange
    // Initialize with initial call returning true
    vi.mocked(initPostHog).mockImplementationOnce(() => true); // First call - simulate initialization

    // Second call should return false (already initialized)
    vi.mocked(initPostHog).mockImplementationOnce(() => false);

    // First render
    const { rerender } = render(
      <PostHogProvider>
        <div data-testid="child">Test Child</div>
      </PostHogProvider>,
    );

    // Verify it was called once with initialization
    expect(initPostHog).toHaveBeenCalledTimes(1);

    // Mock isPostHogInitialized to return true to match what would
    // happen in a real app after the first initialization
    vi.mocked(isPostHogInitialized).mockReturnValue(true);

    // Change a dependency and rerender
    const newConfig = { ...mockConfig, debug: true };
    vi.mocked(createPostHogConfig).mockReturnValue(newConfig);

    // Component should re-render but not reinitialize
    rerender(
      <PostHogProvider>
        <div data-testid="child">Updated Child</div>
      </PostHogProvider>,
    );

    // Verify initPostHog was called during the rerender but returned false (skipped init)
    await waitFor(() => {
      expect(initPostHog).toHaveBeenCalledTimes(2);
    });
  });
});
