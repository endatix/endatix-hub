import React from "react";
import type { ClientStorageConfig } from "@endatix/storage-azure";
import { getClientStorageConfig } from "../storage-runtime";
import { AssetStorageClientProvider } from "./asset-storage.context";

interface AssetStorageProviderProps {
  children: React.ReactNode;
  config?: ClientStorageConfig;
}

/**
 * Server Component that streams Asset Storage configuration to the client.
 * Private reads use POST `read-urls` (per-blob SAS / presigned GET) and client cache — same for Azure and S3.
 */
export function AssetStorageProvider({
  children,
  config: propsConfig,
}: Readonly<AssetStorageProviderProps>) {
  const config = propsConfig ?? getClientStorageConfig();

  return (
    <AssetStorageClientProvider config={config}>
      {children}
    </AssetStorageClientProvider>
  );
}
