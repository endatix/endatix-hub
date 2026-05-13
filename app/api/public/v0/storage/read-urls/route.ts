import { auth } from "@/auth";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { getStorageRuntimeSettings } from "@/features/asset-storage/storage-runtime";
import { bulkGenerateReadTokens } from "@/features/asset-storage/infrastructure/storage-gateway";
import { resolveContainerFromUrl } from "@/features/asset-storage/utils";

/**
 * Request body for the read-urls route.
 */
interface ReadUrlsRequest {
  /**
   * The URLs to generate read tokens for.
   */
  urls: string[];
}

export type ReadUrlResolvedEntry = { url: string } | { error: string };

export interface ReadUrlsResponse {
  resolved: Record<string, ReadUrlResolvedEntry>;
}

function appendSasQueryToUrl(baseUrl: string, sasQuery: string): string {
  if (sasQuery.length === 0) {
    return baseUrl;
  }
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}${sasQuery}`;
}

function isUrlsFieldValid(urls: unknown): urls is string[] {
  if (!Array.isArray(urls)) {
    return false;
  }
  return urls.every((u) => typeof u === "string");
}

interface ParsedReadUrl {
  originalUrl: string;
  containerName: string;
  blobName: string;
}

export async function POST(request: Request): Promise<Response> {
  const storageSettings = getStorageRuntimeSettings();

  if (!storageSettings.isEnabled) {
    return apiResponses.badRequest({ detail: "Storage is not enabled" });
  }

  let body: ReadUrlsRequest;
  try {
    body = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  if (body.urls === undefined) {
    return apiResponses.badRequest({ detail: "urls is required" });
  }

  if (!isUrlsFieldValid(body.urls)) {
    return apiResponses.badRequest({
      detail: "urls must be an array of strings",
    });
  }

  const urls = body.urls;

  if (!storageSettings.isPrivate) {
    const resolved: Record<string, ReadUrlResolvedEntry> = {};
    for (const url of urls) {
      resolved[url] = { url };
    }
    return Response.json({ resolved } satisfies ReadUrlsResponse);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return apiResponses.unauthorized({
      detail: "You must be authenticated to access this resource",
    });
  }

  const config = storageSettings.azure;
  if (config === null) {
    return apiResponses.badRequest({
      detail: "read-urls route requires Azure storage configuration",
    });
  }

  const resolved: Record<string, ReadUrlResolvedEntry> = {};
  const parsed: ParsedReadUrl[] = [];

  for (const url of urls) {
    const containerInfo = resolveContainerFromUrl(url, config);
    if (!containerInfo) {
      resolved[url] = {
        error: "URL does not match a known storage container",
      };
      continue;
    }

    const { containerName, blobName } = containerInfo;
    if (!blobName) {
      resolved[url] = { error: "URL does not contain a blob path" };
      continue;
    }

    parsed.push({ originalUrl: url, containerName, blobName });
  }

  const byContainer = new Map<string, ParsedReadUrl[]>();
  for (const item of parsed) {
    const list = byContainer.get(item.containerName) ?? [];
    list.push(item);
    byContainer.set(item.containerName, list);
  }

  for (const [containerName, items] of byContainer) {
    const resourceNames = [...new Set(items.map((i) => i.blobName))];
    const tokensResult = await bulkGenerateReadTokens({
      containerName,
      resourceType: "file",
      resourceNames,
    });

    if (Result.isError(tokensResult)) {
      const message = `Failed to generate read token: ${tokensResult.message}`;
      for (const item of items) {
        resolved[item.originalUrl] = { error: message };
      }
      continue;
    }

    const { readTokens } = tokensResult.value;
    for (const item of items) {
      const token = readTokens[item.blobName];
      if (!token) {
        resolved[item.originalUrl] = {
          error: "Failed to generate read token for the specified blob",
        };
      } else {
        resolved[item.originalUrl] = {
          url: appendSasQueryToUrl(item.originalUrl, token),
        };
      }
    }
  }

  return Response.json({ resolved } satisfies ReadUrlsResponse);
}
