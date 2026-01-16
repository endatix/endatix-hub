"use client";

import React, { createContext, use, useMemo } from "react";
import { StorageConfig } from "./storage-config-client";

interface StorageConfigContextValue {
  config: StorageConfig | null;
}

const StorageConfigContext = createContext<
  StorageConfigContextValue | undefined
>(undefined);

/**
 * Props for the StorageConfigProvider
 * @type {StorageConfigProviderProps}
 * @description Props for the StorageConfigProvider
 * @property {ReactNode} children - The children to render
 * @property {StorageConfig | Promise<StorageConfig> | null} config - The storage configuration
 */
interface StorageConfigProviderProps {
  children: React.ReactNode;
  config: StorageConfig | Promise<StorageConfig> | null;
}

/**
 * Provider for Storage Configuration.
 * Can accept either a resolved config object or a promise (for streaming).
 */
function StorageConfigProvider({
  children,
  config,
}: Readonly<StorageConfigProviderProps>) {
  const contextVal = useMemo(() => {
    const resolvedConfig = config instanceof Promise ? use(config) : config;
    return { config: resolvedConfig };
  }, [config]);

  return (
    <StorageConfigContext value={contextVal}>{children}</StorageConfigContext>
  );
}

/**
 * Hook to access the Storage Configuration from the context.
 * @throws {Error} If used outside of StorageConfigProvider
 */
function useStorageConfig(): StorageConfig | null {
  const context = use(StorageConfigContext);

  if (!context) {
    throw new Error(
      "useStorageConfig must be used within a StorageConfigProvider. " +
        "Wrap your component tree with <StorageConfigProvider>.",
    );
  }

  return context.config;
}

export {
  StorageConfigContext,
  StorageConfigProvider,
  useStorageConfig,
  type StorageConfigContextValue,
};
