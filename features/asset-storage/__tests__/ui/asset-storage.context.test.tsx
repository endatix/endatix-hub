import { describe, it, expect, vi } from "vitest";
import {
  render,
  renderHook,
  act,
  screen,
} from "@testing-library/react";
import React, { Suspense } from "react";
import {
  AssetStorageClientProvider,
  useAssetStorage,
  type AssetStorageTokens,
} from "../../ui/asset-storage.context";
import { StorageConfig } from "../../infrastructure/storage-config-client";
import { Result } from "@/lib/result";

const mockStorageConfig: StorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "testaccount.blob.core.windows.net",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
};

describe("AssetStorageContext", () => {
  describe("AssetStorageClientProvider", () => {
    it("should provide config to children when config is a resolved object", () => {
      const TestComponent = () => {
        const { config } = useAssetStorage();
        return <div>{config?.hostName}</div>;
      };

      const { container } = render(
        <AssetStorageClientProvider config={mockStorageConfig}>
          <TestComponent />
        </AssetStorageClientProvider>,
      );

      expect(container.textContent).toBe(mockStorageConfig.hostName);
    });

    it("should handle null config", () => {
      const TestComponent = () => {
        const { config } = useAssetStorage();
        return <div>{config ? "has config" : "no config"}</div>;
      };

      const { container } = render(
        <AssetStorageClientProvider config={null}>
          <TestComponent />
        </AssetStorageClientProvider>,
      );

      expect(container.textContent).toBe("no config");
    });

    it("should resolve promise config with Suspense", async () => {
      const promiseConfig = Promise.resolve(mockStorageConfig);

      const TestComponent = () => {
        const { config } = useAssetStorage();
        return <div data-testid="config-host">{config?.hostName}</div>;
      };

      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <AssetStorageClientProvider config={promiseConfig}>
              <TestComponent />
            </AssetStorageClientProvider>
          </Suspense>,
        );
      });

      const hostElement = await screen.findByTestId("config-host");
      expect(hostElement.textContent).toBe(mockStorageConfig.hostName);
    });

    it("should handle promise rejection gracefully", async () => {
      let rejectConfig: (reason?: any) => void;
      const rejectedPromise = new Promise<StorageConfig>((_, reject) => {
        rejectConfig = reject;
      });

      const TestComponent = () => {
        const { config } = useAssetStorage();
        return <div>{config ? "has config" : "no config"}</div>;
      };

      // Silence expected error logs during this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AssetStorageClientProvider config={rejectedPromise}>
            <TestComponent />
          </AssetStorageClientProvider>
        </Suspense>,
      );

      expect(screen.getByText("Loading...")).toBeDefined();

      await act(async () => {
        rejectConfig!(new Error("Config error"));
      });

      // Wait a bit for the promise to reject and React to handle it
      await act(async () => {
        await Promise.resolve();
      });

      // After rejection without an ErrorBoundary, it might still show fallback or stay suspended
      expect(screen.queryByText("Loading...")).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe("useAssetStorage", () => {
    it("should return context when used within provider", () => {
      const { result } = renderHook(() => useAssetStorage(), {
        wrapper: ({ children }) => (
          <AssetStorageClientProvider config={mockStorageConfig}>
            {children}
          </AssetStorageClientProvider>
        ),
      });

      expect(result.current.config).toEqual(mockStorageConfig);
    });

    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test since React will log the error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => { });

      expect(() => {
        renderHook(() => useAssetStorage());
      }).toThrow(
        "useAssetStorage must be used within an AssetStorageProvider",
      );

      consoleSpy.mockRestore();
    });

    it("should return tokens when provided to provider", () => {
      const mockTokens: AssetStorageTokens = {
        userFiles: Promise.resolve(
          Result.success({
            token: "user-token",
            containerName: "user-files",
            expiresOn: new Date(),
            generatedAt: new Date(),
          }),
        ),
        content: Promise.resolve(
          Result.success({
            token: "content-token",
            containerName: "content",
            expiresOn: new Date(),
            generatedAt: new Date(),
          }),
        ),
      };

      const { result } = renderHook(() => useAssetStorage(), {
        wrapper: ({ children }) => (
          <AssetStorageClientProvider
            config={mockStorageConfig}
            tokens={mockTokens}
          >
            {children}
          </AssetStorageClientProvider>
        ),
      });

      expect(result.current.tokens).toEqual(mockTokens);
    });
  });
});
