import { Result } from "../result";
import { extractHostname } from "../utils/url-utils";

/**
 * Default Azure Blob host segment for an account. Shared with
 * {@link getAzureStorageConfig} via {@link resolveAzureBlobStorageHostname}.
 */
export function getDefaultAzureBlobHostname(accountName: string): string {
  return accountName ? `${accountName}.blob.core.windows.net` : "";
}

/**
 * Resolves the blob endpoint hostname from account name and optional custom
 * domain (same rules as `getAzureStorageConfig().hostName`). Bootstrap-safe:
 * no `@/features/*` imports — safe for `next.config` / `withEndatix`.
 */
export function resolveAzureBlobStorageHostname(
  accountName: string,
  customDomain?: string | null,
): string {
  const trimmed = customDomain?.trim();
  if (!trimmed) {
    return getDefaultAzureBlobHostname(accountName);
  }

  const hostnameResult = extractHostname(trimmed);
  if (Result.isSuccess(hostnameResult)) {
    return hostnameResult.value;
  }

  return getDefaultAzureBlobHostname(accountName);
}

/**
 * Returns the blob endpoint hostname for Next.js `images.remotePatterns`, or
 * `null` when Azure storage env is not configured.
 */
export function getAzureStorageHostname(): string | null {
  const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } = process.env;

  const isEnabled = !!AZURE_STORAGE_ACCOUNT_NAME && !!AZURE_STORAGE_ACCOUNT_KEY;
  if (!isEnabled) {
    return null;
  }

  const accountName = AZURE_STORAGE_ACCOUNT_NAME || "";
  const host = resolveAzureBlobStorageHostname(
    accountName,
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN,
  );
  return host || null;
}
