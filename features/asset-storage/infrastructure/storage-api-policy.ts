import { withBasePath } from "@/lib/hosting";

/** Storage API policy: public or hub. */
export type StorageApiPolicy = "public" | "hub";

/** Hub POST route: batch-resolve storage object URLs to presigned GET URLs. */
export const HUB_STORAGE_READ_URLS_PATH = withBasePath(
  "/api/hub/v0/storage/read-urls",
);

/** Public POST route: batch-resolve storage object URLs to presigned GET URLs. */
export const PUBLIC_STORAGE_READ_URLS_PATH = withBasePath(
  "/api/public/v0/storage/read-urls",
);

/** Public DELETE route: token/cookie-gated submission file removal. */
export const PUBLIC_STORAGE_DELETE_PATH = withBasePath(
  "/api/public/v0/storage/delete",
);

/** Hub DELETE route: authenticated hub session file removal. */
export const HUB_STORAGE_DELETE_PATH = withBasePath(
  "/api/hub/v0/storage/delete",
);

const POLICY_PATHS = {
  public: {
    readUrls: PUBLIC_STORAGE_READ_URLS_PATH,
    delete: PUBLIC_STORAGE_DELETE_PATH,
  },
  hub: {
    readUrls: HUB_STORAGE_READ_URLS_PATH,
    delete: HUB_STORAGE_DELETE_PATH,
  },
} as const;

export function pickStorageReadEndpoint(
  policyName: StorageApiPolicy,
): typeof PUBLIC_STORAGE_READ_URLS_PATH | typeof HUB_STORAGE_READ_URLS_PATH {
  return POLICY_PATHS[policyName].readUrls;
}

export function pickStorageDeleteEndpoint(
  policyName: StorageApiPolicy,
): typeof PUBLIC_STORAGE_DELETE_PATH | typeof HUB_STORAGE_DELETE_PATH {
  return POLICY_PATHS[policyName].delete;
}
