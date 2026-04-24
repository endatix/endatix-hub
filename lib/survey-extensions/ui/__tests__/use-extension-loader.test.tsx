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
    loading: "dynamic",
    metadata,
    load: vi.fn().mockResolvedValue(loadResult),
  };
}

describe("useExtensionLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(result.current.onCreatorCreated).toBeDefined();
    expect(typeof result.current.onCreatorCreated).toBe("function");
  });

  it("onCreatorCreated invokes onCreatorReady for loaded extensions", async () => {
    // Arrange
    const onCreatorReady = vi.fn();
    const allExtensions: ExtensionDefinition[] = [
      createExtension("ext-creator", { onCreatorReady }),
    ];
    const extensionIdsToLoad = ["ext-creator"];
    const mockCreator = {} as any;

    // Act
    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    act(() => {
      result.current.onCreatorCreated(mockCreator);
    });

    // Assert
    expect(onCreatorReady).toHaveBeenCalledTimes(1);
    expect(onCreatorReady).toHaveBeenCalledWith(mockCreator);
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
        loading: "dynamic",
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

  it("initializes static module only once for the same extension id", async () => {
    // Arrange
    const onInit = vi.fn();
    const allExtensions: ExtensionDefinition[] = [
      {
        id: "ext-static",
        type: "feature",
        loading: "static",
        module: { onInit },
      },
    ];

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useExtensionLoader({ allExtensions, extensionIdsToLoad: ids }),
      {
        initialProps: { ids: ["ext-static"] },
      },
    );

    // Act
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    rerender({ ids: ["ext-static"] });
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Assert
    expect(onInit).toHaveBeenCalledTimes(1);
  });

  it("invokes static module runtime hooks", async () => {
    const onModelReady = vi.fn();
    const onCreatorReady = vi.fn();
    const allExtensions: ExtensionDefinition[] = [
      {
        id: "ext-static-module",
        type: "feature",
        loading: "static",
        module: {
          onInit: vi.fn(),
          onModelReady,
          onCreatorReady,
        } satisfies ExtensionModule,
      },
    ];

    const { result } = renderHook(() =>
      useExtensionLoader({
        allExtensions,
        extensionIdsToLoad: ["ext-static-module"],
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const mockModel = {} as any;
    const mockCreator = {} as any;
    act(() => {
      result.current.onModelCreated(mockModel);
      result.current.onCreatorCreated(mockCreator);
    });

    expect(onModelReady).toHaveBeenCalledWith(mockModel);
    expect(onCreatorReady).toHaveBeenCalledWith(mockCreator);
  });

  it("does not reload dynamic extensions when ids order changes", async () => {
    // Arrange
    const loadA = vi.fn().mockResolvedValue({ onModelReady: vi.fn() });
    const loadB = vi.fn().mockResolvedValue({ onModelReady: vi.fn() });
    const allExtensions: ExtensionDefinition[] = [
      { id: "ext-order-a", type: "question", loading: "dynamic", load: loadA },
      { id: "ext-order-b", type: "question", loading: "dynamic", load: loadB },
    ];

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useExtensionLoader({ allExtensions, extensionIdsToLoad: ids }),
      {
        initialProps: { ids: ["ext-order-a", "ext-order-b"] },
      },
    );

    // Act
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    rerender({ ids: ["ext-order-b", "ext-order-a"] });
    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    // Assert
    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
  });

  it("keeps readiness false until required dynamic modules resolve", async () => {
    // Arrange
    let resolveLoad: ((value: ExtensionModule) => void) | undefined;
    const slowLoad = vi.fn().mockImplementation(
      () =>
        new Promise<ExtensionModule>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const allExtensions: ExtensionDefinition[] = [
      { id: "ext-slow", type: "question", loading: "dynamic", load: slowLoad },
    ];

    const { result } = renderHook(() =>
      useExtensionLoader({ allExtensions, extensionIdsToLoad: ["ext-slow"] }),
    );

    // Assert
    expect(result.current.isReady).toBe(false);

    // Act
    act(() => {
      resolveLoad?.({ onModelReady: vi.fn() });
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });
});
