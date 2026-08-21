import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EndatixConfigProvider } from "@/components/providers/endatix-config-provider";
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

vi.mock("@/extensions/user-extensions", () => ({
  userExtensions: [{ id: "user-a", type: "question" as const }],
}));
vi.mock("../../core-registry", () => ({
  coreExtensions: [{ id: "core-a", type: "feature" as const }],
}));

describe("useSurveyExtensions", () => {
  const runtimeDeps = {
    getRuntimeState: () => ({ formId: "123" }),
  };

  function wrap(extensionsEnabled: boolean) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <EndatixConfigProvider
          value={{
            apiBaseUrl: "https://api.example.com/api",
            extensionsEnabled,
          }}
        >
          {children}
        </EndatixConfigProvider>
      );
    };
  }

  beforeEach(() => {
    mockUseExtensionLoader.mockReturnValue({
      isReady: true,
      onModelCreated: vi.fn(),
    });
    mockGetRequiredExtensionIds.mockReturnValue([]);
    mockGetRequiredExtensionIds.mockClear();
  });

  it("passes extensionIdsToLoad through to useExtensionLoader when provided", () => {
    const extensionIdsToLoad = ["ext-1", "ext-2"];

    renderHook(() => useSurveyExtensions({ extensionIdsToLoad, runtimeDeps }), {
      wrapper: wrap(true),
    });

    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: ["ext-1", "ext-2"],
        runtimeDeps,
      }),
    );
    expect(mockGetRequiredExtensionIds).not.toHaveBeenCalled();
  });

  it("prefers extensionIdsToLoad over formJson analysis when both are provided", () => {
    const extensionIdsToLoad = ["server-ext-a"];
    const formJson = { pages: [{ elements: [{ type: "country" }] }] };

    renderHook(
      () => useSurveyExtensions({ extensionIdsToLoad, formJson, runtimeDeps }),
      { wrapper: wrap(true) },
    );

    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: ["server-ext-a"],
        runtimeDeps: expect.objectContaining({
          getRuntimeState: expect.any(Function),
        }),
      }),
    );
    expect(mockGetRequiredExtensionIds).not.toHaveBeenCalled();
  });

  it("calls getRequiredExtensionIds when formJson provided and extensions enabled", () => {
    mockGetRequiredExtensionIds.mockReturnValue(["country", "hello-world"]);
    const formJson = { pages: [] };

    renderHook(() => useSurveyExtensions({ formJson, runtimeDeps }), {
      wrapper: wrap(true),
    });

    expect(mockGetRequiredExtensionIds).toHaveBeenCalledWith(
      formJson,
      expect.any(Array),
    );
    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: ["country", "hello-world"],
        runtimeDeps: expect.objectContaining({
          getRuntimeState: expect.any(Function),
        }),
      }),
    );
  });

  it("passes empty extensionIdsToLoad when client extensionsEnabled is not true", () => {
    const formJson = { pages: [] };

    renderHook(() => useSurveyExtensions({ formJson, runtimeDeps }), {
      wrapper: wrap(false),
    });

    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionIdsToLoad: [],
        runtimeDeps: expect.objectContaining({
          getRuntimeState: expect.any(Function),
        }),
      }),
    );
    expect(mockGetRequiredExtensionIds).not.toHaveBeenCalled();
  });

  it("passes runtimeDeps unchanged when formJson is omitted", () => {
    renderHook(
      () => useSurveyExtensions({ extensionIdsToLoad: ["ext-a"], runtimeDeps }),
      { wrapper: wrap(true) },
    );
    expect(mockUseExtensionLoader).toHaveBeenCalledWith(
      expect.objectContaining({ runtimeDeps }),
    );
  });

  it("returns whatever useExtensionLoader returns", () => {
    const ret = { isReady: false, onModelCreated: vi.fn() };
    mockUseExtensionLoader.mockReturnValue(ret);

    const { result } = renderHook(
      () => useSurveyExtensions({ extensionIdsToLoad: [], runtimeDeps }),
      { wrapper: wrap(true) },
    );

    expect(result.current).toBe(ret);
    expect(result.current.isReady).toBe(false);
    expect(result.current.onModelCreated).toBe(ret.onModelCreated);
  });
});
