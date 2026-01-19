"use client";

import React, { createContext, use, useMemo } from "react";
import { StorageConfig } from "../infrastructure/storage-config-client";
import { ReadTokenResult } from "../types";

export interface AssetStorageTokens {
  userFiles: Promise<ReadTokenResult>;
  content: Promise<ReadTokenResult>;
}

export interface AssetStorageContextValue {
  config: StorageConfig | null;
  tokens?: AssetStorageTokens;
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

  const contextVal = useMemo(
    () => ({
      config: resolvedConfig,
      tokens,
    }),
    [resolvedConfig, tokens],
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
