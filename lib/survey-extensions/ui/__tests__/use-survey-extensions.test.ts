import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSurveyExtensions } from "../use-survey-extensions";

const mockUseExtensionLoader = vi.fn();
vi.mock("../use-extension-loader", () => ({
  useExtensionLoader: (opts: unknown) => mockUseExtensionLoader(opts),
}));

const mockGetRequiredExtensionIds = vi.fn();
vi.mock("../../server/analyzer", () => ({
  getRequiredExtensionIds: (formJson: unknown, all: unknown[]) =>
    mockGetRequiredExtensionIds(formJson, all),
}));

// ALL_EXTENSIONS is built from core + user; mock so we control what the hook sees
vi.mock("@/extensions/user-extensions", () => ({
  userExtensions: [{ id: "user-a", type: "question" as const }],
}));
vi.mock("../../core-registry", () => ({
  coreExtensions: [{ id: "core-a", type: "feature" as const }],
}));

describe("useSurveyExtensions", () => {
  const originalEnv = process.env;
  const runtimeDeps = {
    getRuntimeState: () => ({ formId: "123" }),
  };

  beforeEach(() => {
    mockUseExtensionLoader.mockReturnValue({
      isReady: true,
      onModelCreated: vi.fn(),
    });
    mockGetRequiredExtensionIds.mockReturnValue([]);
    mockGetRequiredExtensionIds.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("passes extensionIdsToLoad through to useExtensionLoader when provided", () => {
    // Arrange – must be enabled so we don't short-circuit to []
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
    const extensionIdsToLoad = ["ext-1", "ext-2"];

    // Act
    renderHook(() => useSurveyExtensions({ extensionIdsToLoad, runtimeDeps }));

    // Assert
    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: ["ext-1", "ext-2"],
        runtimeDeps,
      }),
    );
    expect(mockGetRequiredExtensionIds).not.toHaveBeenCalled();
  });

  it("prefers extensionIdsToLoad over formJson analysis when both are provided", () => {
    // Arrange – server-provided whitelist should short-circuit client detection
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
    const extensionIdsToLoad = ["server-ext-a"];
    const formJson = { pages: [{ elements: [{ type: "country" }] }] };

    // Act
    renderHook(() => useSurveyExtensions({ extensionIdsToLoad, formJson, runtimeDeps }));

    // Assert
    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: ["server-ext-a"],
        runtimeDeps,
      }),
    );
    expect(mockGetRequiredExtensionIds).not.toHaveBeenCalled();
  });

  it("calls getRequiredExtensionIds when formJson provided and extensions enabled", () => {
    // Arrange
    process.env.ENDATIX_ENABLE_EXTENSIONS = "true";
    mockGetRequiredExtensionIds.mockReturnValue(["country", "hello-world"]);
    const formJson = { pages: [] };

    // Act
    renderHook(() => useSurveyExtensions({ formJson, runtimeDeps }));

    // Assert
    expect(mockGetRequiredExtensionIds).toHaveBeenCalledWith(
      formJson,
      expect.any(Array),
    );
    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: ["country", "hello-world"],
        runtimeDeps,
      }),
    );
  });

  it('passes empty extensionIdsToLoad when ENDATIX_ENABLE_EXTENSIONS is not "true"', () => {
    // Arrange
    process.env.ENDATIX_ENABLE_EXTENSIONS = "false";
    const formJson = { pages: [] };

    // Act
    renderHook(() => useSurveyExtensions({ formJson, runtimeDeps }));

    // Assert – ids should be [] so no extensions load, getRequiredExtensionIds not used
    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: [],
        runtimeDeps,
      }),
    );
    expect(mockGetRequiredExtensionIds).not.toHaveBeenCalled();
  });

  it("returns whatever useExtensionLoader returns", () => {
    // Arrange
    const ret = { isReady: false, onModelCreated: vi.fn() };
    mockUseExtensionLoader.mockReturnValue(ret);

    // Act
    const { result } = renderHook(() =>
      useSurveyExtensions({ extensionIdsToLoad: [], runtimeDeps }),
    );

    // Assert
    expect(result.current).toBe(ret);
    expect(result.current.isReady).toBe(false);
    expect(result.current.onModelCreated).toBe(ret.onModelCreated);
  });
});
