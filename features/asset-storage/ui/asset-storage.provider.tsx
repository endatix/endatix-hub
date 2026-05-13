import React from "react";
import type { StorageConfig } from "@endatix/storage-azure";
import {
  getClientStorageConfig,
  getStorageRuntimeSettings,
} from "../storage-runtime";
import { generateReadTokensAction } from "../use-cases/view-protected-files/generate-read-tokens.action";
import { AssetStorageClientProvider, AssetStorageTokens } from "./asset-storage.context";

interface AssetStorageProviderProps {
  children: React.ReactNode;
  config?: StorageConfig;
  tokens?: AssetStorageTokens;
}
/**
 * Server Component that orchestrates Asset Storage configuration and tokens.
 * It passes the promises to the client-side provider to enable streaming.
 * 
 * Performance Note: By passing Promises (instead of awaiting them here), 
 * we avoid blocking the initial HTML response. React 19 handles the 
 * serialization and resolution on the client automatically.
 */
export function AssetStorageProvider({
  children,
  config: propsConfig,
  tokens: propsTokens,
}: Readonly<AssetStorageProviderProps>) {
  const readModel = getStorageRuntimeSettings();
  const serverConfig = getClientStorageConfig(readModel);

  const config = propsConfig ?? serverConfig;

  const tokens: AssetStorageTokens = propsTokens ?? {
    content: generateReadTokensAction(serverConfig.containerNames.CONTENT),
    userFiles: generateReadTokensAction(serverConfig.containerNames.USER_FILES),
  };

  return (
    <AssetStorageClientProvider config={config} tokens={tokens}>
      {children}
    </AssetStorageClientProvider>
  );
}
