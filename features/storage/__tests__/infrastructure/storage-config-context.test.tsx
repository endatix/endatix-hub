import { describe, it, expect, vi } from "vitest";
import {
  render,
  renderHook,
  act,
  screen,
} from "@testing-library/react";
import React, { Suspense } from "react";
import {
  StorageConfigProvider,
  useStorageConfig,
} from "@/features/storage/infrastructure/storage-config-context";
import { StorageConfig } from "@/features/storage/infrastructure/storage-config-client";

const mockStorageConfig: StorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "testaccount.blob.core.windows.net",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
};

describe("StorageConfigContext", () => {
  describe("StorageConfigProvider", () => {
    it("should provide config to children when config is a resolved object", () => {
      const TestComponent = () => {
        const config = useStorageConfig();
        return <div>{config?.hostName}</div>;
      };

      const { container } = render(
        <StorageConfigProvider config={mockStorageConfig}>
          <TestComponent />
        </StorageConfigProvider>,
      );

      expect(container.textContent).toBe(mockStorageConfig.hostName);
    });

    it("should handle null config", () => {
      const TestComponent = () => {
        const config = useStorageConfig();
        return <div>{config ? "has config" : "no config"}</div>;
      };

      const { container } = render(
        <StorageConfigProvider config={null}>
          <TestComponent />
        </StorageConfigProvider>,
      );

      expect(container.textContent).toBe("no config");
    });

    it("should resolve promise config with Suspense", async () => {
      const promiseConfig = Promise.resolve(mockStorageConfig);

      const TestComponent = () => {
        const config = useStorageConfig();
        return <div data-testid="config-host">{config?.hostName}</div>;
      };

      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <StorageConfigProvider config={promiseConfig}>
              <TestComponent />
            </StorageConfigProvider>
          </Suspense>,
        );
      });

      const hostElement = await screen.findByTestId("config-host");
      expect(hostElement.textContent).toBe(mockStorageConfig.hostName);
    });

    it("should handle promise rejection gracefully", async () => {
      const rejectedPromise = Promise.reject(new Error("Config error"));

      const TestComponent = () => {
        const config = useStorageConfig();
        return <div>{config ? "has config" : "no config"}</div>;
      };

      // This will throw, but we want to test that Suspense handles it
      const { container } = render(
        <Suspense fallback={<div>Loading...</div>}>
          <StorageConfigProvider config={rejectedPromise}>
            <TestComponent />
          </StorageConfigProvider>
        </Suspense>,
      );

      // Wait a bit for the promise to reject
      await act(async () => {
        try {
          await rejectedPromise;
        } catch {
          // Expected rejection
        }
        await Promise.resolve();
      });

      // The component should show fallback or error boundary
      expect(container.textContent).toBe("Loading...");
    });
  });

  describe("useStorageConfig", () => {
    it("should return config when used within provider", () => {
      const { result } = renderHook(() => useStorageConfig(), {
        wrapper: ({ children }) => (
          <StorageConfigProvider config={mockStorageConfig}>
            {children}
          </StorageConfigProvider>
        ),
      });

      expect(result.current).toEqual(mockStorageConfig);
    });

    it("should return null when provider has null config", () => {
      const { result } = renderHook(() => useStorageConfig(), {
        wrapper: ({ children }) => (
          <StorageConfigProvider config={null}>
            {children}
          </StorageConfigProvider>
        ),
      });

      expect(result.current).toBeNull();
    });

    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test since React will log the error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useStorageConfig());
      }).toThrow(
        "useStorageConfig must be used within a StorageConfigProvider",
      );

      consoleSpy.mockRestore();
    });

    it("should update when config changes", () => {
      let currentConfig: StorageConfig | null = mockStorageConfig;

      const { rerender, result } = renderHook(() => useStorageConfig(), {
        wrapper: ({ children }) => (
          <StorageConfigProvider config={currentConfig}>
            {children}
          </StorageConfigProvider>
        ),
      });

      expect(result.current).toEqual(mockStorageConfig);

      const newConfig: StorageConfig = {
        ...mockStorageConfig,
        hostName: "newaccount.blob.core.windows.net",
      };

      currentConfig = newConfig;
      rerender();

      expect(result.current).toEqual(newConfig);
    });

    it("should handle config with different isPrivate values", () => {
      const publicConfig: StorageConfig = {
        ...mockStorageConfig,
        isPrivate: false,
      };

      const { result } = renderHook(() => useStorageConfig(), {
        wrapper: ({ children }) => (
          <StorageConfigProvider config={publicConfig}>
            {children}
          </StorageConfigProvider>
        ),
      });

      expect(result.current?.isPrivate).toBe(false);
    });

    it("should handle config with different container names", () => {
      const customConfig: StorageConfig = {
        ...mockStorageConfig,
        containerNames: {
          USER_FILES: "custom-user-files",
          CONTENT: "custom-content",
        },
      };

      const { result } = renderHook(() => useStorageConfig(), {
        wrapper: ({ children }) => (
          <StorageConfigProvider config={customConfig}>
            {children}
          </StorageConfigProvider>
        ),
      });

      expect(result.current?.containerNames).toEqual(
        customConfig.containerNames,
      );
    });
  });
});
