import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useExtensionLoader } from "../use-extension-loader";
import type { ExtensionDefinition, ExtensionModule } from "../../types";

vi.mock("survey-react-ui", () => ({
  ReactElementFactory: {
    Instance: {
      registerElement: vi.fn(),
    },
  },
}));

function createExtension(
  id: string,
  loadResult: ExtensionModule | undefined,
  metadata?: { name: string },
): ExtensionDefinition {
  return {
    id,
    type: "question",
    metadata,
    load: vi.fn().mockResolvedValue(loadResult),
  };
}

describe("useExtensionLoader", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns isReady true immediately when extensionIdsToLoad is empty", async () => {
    // Arrange
    const allExtensions: ExtensionDefinition[] = [];
    const extensionIdsToLoad: string[] = [];

    // Act
    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Assert
    expect(result.current.onModelCreated).toBeDefined();
    expect(typeof result.current.onModelCreated).toBe("function");
  });

  it("returns isReady true after extensions load and onModelCreated invokes onModelReady", async () => {
    // Arrange
    const onModelReady = vi.fn();
    const allExtensions: ExtensionDefinition[] = [
      createExtension("ext-a", { onModelReady }, { name: "extA" }),
    ];
    const extensionIdsToLoad = ["ext-a"];
    const mockModel = {} as any;

    // Act
    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    act(() => {
      result.current.onModelCreated(mockModel);
    });

    // Assert
    expect(onModelReady).toHaveBeenCalledTimes(1);
    expect(onModelReady).toHaveBeenCalledWith(mockModel);
  });

  it("handles load returning undefined and still sets ready", async () => {
    // Arrange – use unique id so we don't hit cache from other tests
    const allExtensions: ExtensionDefinition[] = [
      createExtension("ext-no-module", undefined),
    ];
    const extensionIdsToLoad = ["ext-no-module"];

    // Act
    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Assert – onModelCreated should not throw when module is missing
    act(() => {
      result.current.onModelCreated({} as any);
    });
    expect(result.current.isReady).toBe(true);
  });

  it("handles load rejection and still sets ready", async () => {
    // Arrange
    const allExtensions: ExtensionDefinition[] = [
      {
        id: "ext-rejects",
        type: "question",
        load: vi.fn().mockRejectedValue(new Error("load failed")),
      },
    ];
    const extensionIdsToLoad = ["ext-rejects"];

    // Act
    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Assert
    expect(result.current.isReady).toBe(true);
    act(() => {
      result.current.onModelCreated({} as any);
    });
  });

  it("onModelCreated only calls onModelReady for extensions in extensionIdsToLoad", async () => {
    // Arrange – use unique ids so we don't reuse cached modules from other tests
    const onModelReadyA = vi.fn();
    const onModelReadyB = vi.fn();
    const allExtensions: ExtensionDefinition[] = [
      createExtension("ext-only-a", { onModelReady: onModelReadyA }),
      createExtension("ext-only-b", { onModelReady: onModelReadyB }),
    ];
    const extensionIdsToLoad = ["ext-only-a"]; // only load A

    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const mockModel = {} as any;
    act(() => {
      result.current.onModelCreated(mockModel);
    });

    // Assert – only A was loaded and only A's onModelReady is called
    expect(onModelReadyA).toHaveBeenCalledWith(mockModel);
    expect(onModelReadyB).not.toHaveBeenCalled();
  });
});
