import React from "react";
import { getStorageConfig } from "../infrastructure/storage-config";
import { StorageConfig } from "../infrastructure/storage-config-client";
import { generateReadTokensAction } from "../use-cases/view-protected-files/generate-read-tokens.action";
import { AssetStorageClientProvider, AssetStorageTokens } from "./asset-storage.context";

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
}: {
  children: React.ReactNode;
  config?: StorageConfig;
  tokens?: AssetStorageTokens;
}) {
  const serverConfig = getStorageConfig();
  
  const config = propsConfig ?? {
    isEnabled: serverConfig.isEnabled,
    isPrivate: serverConfig.isPrivate,
    hostName: serverConfig.hostName,
    protocol: serverConfig.protocol,
    containerNames: serverConfig.containerNames,
  };

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
