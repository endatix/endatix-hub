"use client";

import { Result } from "@/lib/result";
import React, { createContext, use, useCallback, useMemo } from "react";
import { StorageConfig } from "../infrastructure/storage-config-client";
import { ReadTokenResult } from "../types";
import { enhanceUrlWithToken, resolveContainerFromUrl } from "../utils";

export interface AssetStorageTokens {
  userFiles: Promise<ReadTokenResult>;
  content: Promise<ReadTokenResult>;
}

export interface AssetStorageContextValue {
  config: StorageConfig | null;
  tokens?: AssetStorageTokens;
  resolveStorageUrl: (url: string) => string;
}

export const AssetStorageContext = createContext<
  AssetStorageContextValue | undefined
>(undefined);

interface AssetStorageClientProviderProps {
  children: React.ReactNode;
  config: StorageConfig | Promise<StorageConfig> | null;
  tokens?: AssetStorageTokens;
}

/**
 * Client-side provider for Asset Storage.
 * Handles the React Context for storage configuration and tokens.
 */
export function AssetStorageClientProvider({
  children,
  config,
  tokens,
}: Readonly<AssetStorageClientProviderProps>) {
  const resolvedConfig = config instanceof Promise ? use(config) : config;
  const userFilesResult = tokens?.userFiles ? use(tokens.userFiles) : null;
  const contentResult = tokens?.content ? use(tokens.content) : null;

  const resolveStorageUrl = useCallback(
    (url: string) => {
      if (!resolvedConfig?.isEnabled || !resolvedConfig?.isPrivate || !url) {
        return url;
      }

      const containerInfo = resolveContainerFromUrl(url, resolvedConfig);
      if (!containerInfo) {
        return url;
      }

      // 2. Select the appropriate token based on container type
      const tokenResult =
        containerInfo.containerType === "USER_FILES"
          ? userFilesResult
          : contentResult;

      // 3. Apply token if successful
      if (tokenResult && Result.isSuccess(tokenResult)) {
        return enhanceUrlWithToken(url, tokenResult.value.token);
      }

      return url;
    },
    [resolvedConfig, userFilesResult, contentResult],
  );

  const contextVal = useMemo(
    () => ({
      config: resolvedConfig,
      tokens,
      resolveStorageUrl,
    }),
    [resolvedConfig, tokens, resolveStorageUrl],
  );

  return (
    <AssetStorageContext value={contextVal}>{children}</AssetStorageContext>
  );
}

/**
 * Hook to access the Asset Storage context.
 * Consolidates config and tokens into a single hook.
 * @throws {Error} If used outside of AssetStorageProvider
 */
export function useAssetStorage(): AssetStorageContextValue {
  const context = use(AssetStorageContext);

  if (!context) {
    throw new Error(
      "useAssetStorage must be used within an AssetStorageProvider. " +
      "Wrap your component tree with <AssetStorageProvider>.",
    );
  }

  return context;
}
