import type { StorageConfig } from "@endatix/storage-azure";
import { IMAGE_SERVICE_CONFIG } from "../infrastructure/image-service";

/** Minimal valid {@link StorageConfig} for unit tests (client-safe subset). */
export const TEST_CLIENT_STORAGE_CONFIG: StorageConfig = {
  isEnabled: true,
  isPrivate: false,
  hostName: "testaccount.blob.core.windows.net",
  protocol: "https",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
  imageConfig: IMAGE_SERVICE_CONFIG,
};

export function clientStorageConfig(
  overrides: Partial<StorageConfig> = {},
): StorageConfig {
  return { ...TEST_CLIENT_STORAGE_CONFIG, ...overrides };
}
