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
  endpoint?: string;
  publicBaseUrl?: string;
  requireWhenEnabled: boolean;
  missingEnvKeys: readonly string[];
  misconfiguredEnvKeys: readonly string[];
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
  const endpoint = params.endpoint?.trim() ?? "";
  const publicBaseUrl = params.publicBaseUrl?.trim() ?? "";
  const source = publicBaseUrl.length > 0 ? publicBaseUrl : endpoint;

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

  return { host: storageHostUrl.host, protocol };
}
