"use client";

import React, { createContext, use } from "react";
import { StorageConfig } from "./storage-config-client";

interface StorageConfigContextValue {
  config: StorageConfig | null;
}

const StorageConfigContext = createContext<StorageConfigContextValue>({
  config: null,
});

/**
 * Provider for Storage Configuration.
 * Can accept either a resolved config object or a promise (for streaming).
 */
export function StorageConfigProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: StorageConfig | Promise<StorageConfig> | null;
}) {
  const resolvedConfig = config instanceof Promise ? use(config) : config;

  return (
    <StorageConfigContext.Provider value={{ config: resolvedConfig }}>
      {children}
    </StorageConfigContext.Provider>
  );
}

/**
 * Hook to access the Storage Configuration from the context.
 */
export function useStorageConfig(): StorageConfig | null {
  const context = use(StorageConfigContext);
  if (!context) {
    throw new Error(
      "useStorageConfig must be used within a StorageConfigProvider",
    );
  }
  return context.config;
}
