import {
  MisconfigurationError,
  MissingConfigurationError,
  type StorageProviderId,
} from "./storage-configuration-errors";

export type StoragePublicHost = {
  host: string;
  protocol: "https" | "http";
};

export type ResolveStoragePublicHostParams = {
  provider: StorageProviderId;
  url?: string;
  requireWhenEnabled: boolean;
  missingEnvKeys: readonly string[];
  misconfiguredEnvKeys: readonly string[];
  requireOriginOnly?: boolean;
};

function normalizeUrlSource(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length > 0 &&
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  ) {
    return `https://${trimmed}`;
  }
  
  return trimmed;
}

/**
 * Resolves the browser-facing storage host and protocol from explicit env URLs.
 * No defaults or account-derived hostnames.
 */
export function resolveStoragePublicHost(
  params: ResolveStoragePublicHostParams,
): StoragePublicHost {
  const source = params.url?.trim() ?? "";

  if (source.length === 0) {
    if (!params.requireWhenEnabled) {
      return { host: "", protocol: "https" };
    }
    throw new MissingConfigurationError(
      `Storage requires ${params.missingEnvKeys.join(" or ")} when credentials are configured.`,
      params.missingEnvKeys,
      params.provider,
    );
  }

  const normalized = normalizeUrlSource(source);
  let storageHostUrl: URL;
  try {
    storageHostUrl = new URL(normalized);
  } catch {
    throw new MisconfigurationError(
      `Invalid storage URL "${source}". Set ${params.misconfiguredEnvKeys.join(" or ")} to a valid absolute URL.`,
      params.misconfiguredEnvKeys,
      params.provider,
      source,
    );
  }

  if (storageHostUrl.host.length === 0) {
    throw new MisconfigurationError(
      `Invalid storage URL "${source}". URL must include a hostname.`,
      params.misconfiguredEnvKeys,
      params.provider,
      source,
    );
  }

  const protocol = storageHostUrl.protocol === "http:" ? "http" : "https";

  if (
    params.requireOriginOnly === true &&
    (storageHostUrl.pathname !== "/" ||
      storageHostUrl.search.length > 0 ||
      storageHostUrl.hash.length > 0)
  ) {
    throw new MisconfigurationError(
      `Invalid storage URL "${source}". URL must be an origin without path, query, or fragment.`,
      params.misconfiguredEnvKeys,
      params.provider,
      source,
    );
  }

  return { host: storageHostUrl.host, protocol };
}
