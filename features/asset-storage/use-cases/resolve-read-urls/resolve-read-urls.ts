import { Result } from "@/lib/result";
import {
  assertHubObjectAccess,
  assertPublicObjectAccess,
  authorizeFormStorageAccess,
} from "@/features/form-access/server";
import type {
  HubStorageScope,
  FormStorageGateInput,
} from "@/features/form-access/server";
import { formAccessForbidden } from "@/features/form-access/server";
import { appendStorageReadQuery } from "@/features/asset-storage/infrastructure/append-storage-read-query";
import { getActiveStorageProvider } from "@/features/asset-storage/storage-runtime";
import type { IStorageProvider } from "@/features/asset-storage/infrastructure/core/storage-provider.interface";
import {
  parseStorageObjectUrl,
  type ParsedStorageObjectUrl,
} from "@/features/asset-storage/utils";
import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";

export type ReadUrlResolvedEntry = { url: string } | { error: string };

export interface ReadUrlsResponse {
  resolved: Record<string, ReadUrlResolvedEntry>;
}

interface ParsedReadUrl {
  originalUrl: string;
  containerName: string;
  blobName: string;
}

type StorageObjectAccessAssert = (
  parsed: ParsedStorageObjectUrl,
) => string | null;

interface ResolvePresignedReadUrlsInput {
  urls: string[];
  clientConfig: ClientStorageConfig;
  assertObject: StorageObjectAccessAssert;
}

interface PrivateReadUrlParseResult {
  parsed: ParsedReadUrl[];
  resolved: Record<string, ReadUrlResolvedEntry>;
}

/**
 * Public form read-urls: OSS gate, per-object path checks, then provider presign.
 */
export async function resolvePublicReadUrls(input: {
  gate: FormStorageGateInput;
  hubAccessToken?: string;
  urls: string[];
  clientConfig: ClientStorageConfig;
}): Promise<Result<ReadUrlsResponse>> {
  const accessResult = await authorizeFormStorageAccess(input.gate, {
    hubAccessToken: input.hubAccessToken,
  });
  if (Result.isError(accessResult)) {
    return accessResult;
  }

  const access = accessResult.value;
  if (!access.canViewFiles) {
    return formAccessForbidden("File view is not permitted");
  }

  const accessForPaths = {
    ...access,
    submissionId: access.submissionId ?? input.gate.submissionId,
  };

  return resolvePresignedReadUrls({
    urls: input.urls,
    clientConfig: input.clientConfig,
    assertObject: (parsed) =>
      assertPublicObjectAccess(parsed, accessForPaths, input.clientConfig),
  });
}

/**
 * Hub read-urls: authenticated session + per-object hub path rules.
 */
export async function resolveHubReadUrls(input: {
  scope: HubStorageScope;
  urls: string[];
  clientConfig: ClientStorageConfig;
}): Promise<Result<ReadUrlsResponse>> {
  return resolvePresignedReadUrls({
    urls: input.urls,
    clientConfig: input.clientConfig,
    assertObject: (parsed) =>
      assertHubObjectAccess(parsed, input.scope, input.clientConfig),
  });
}

async function resolvePresignedReadUrls(
  input: ResolvePresignedReadUrlsInput,
): Promise<Result<ReadUrlsResponse>> {
  const { urls, clientConfig, assertObject } = input;

  const configResult = validateReadUrlConfig(clientConfig);
  if (Result.isError(configResult)) {
    return configResult;
  }

  if (!clientConfig.isPrivate) {
    return Result.success(createPublicReadUrlsResponse(urls));
  }

  const parsedResult = parsePrivateReadUrls({
    urls,
    clientConfig,
    assertObject,
  });
  const signedUrls = await resolvePrivateReadUrls(
    parsedResult.parsed,
    getActiveStorageProvider(),
  );

  return Result.success({
    resolved: {
      ...parsedResult.resolved,
      ...signedUrls,
    },
  });
}

function validateReadUrlConfig(
  clientConfig: ClientStorageConfig,
): Result<void> {
  if (!clientConfig.isEnabled) {
    return Result.validationError("Storage is not enabled");
  }

  if (!clientConfig.hostName) {
    return Result.validationError(
      "read-urls requires storage hostname configuration (Azure or S3)",
    );
  }

  return Result.success(undefined);
}

function createPublicReadUrlsResponse(urls: string[]): ReadUrlsResponse {
  const resolved: Record<string, ReadUrlResolvedEntry> = {};
  for (const url of urls) {
    resolved[url] = { url };
  }

  return { resolved };
}

function parsePrivateReadUrls(
  input: ResolvePresignedReadUrlsInput,
): PrivateReadUrlParseResult {
  const { urls, clientConfig, assertObject } = input;
  const parsed: ParsedReadUrl[] = [];
  const resolved: Record<string, ReadUrlResolvedEntry> = {};

  for (const url of urls) {
    const located = parseStorageObjectUrl(url, clientConfig);
    if (located === null) {
      resolved[url] = { error: "URL does not match configured storage" };
      continue;
    }

    const accessError = assertObject(located);
    if (accessError !== null) {
      resolved[url] = { error: accessError };
      continue;
    }

    parsed.push({
      originalUrl: url,
      containerName: located.containerName,
      blobName: located.blobName,
    });
  }

  return { parsed, resolved };
}

async function resolvePrivateReadUrls(
  parsed: ParsedReadUrl[],
  provider: IStorageProvider | null,
): Promise<Record<string, ReadUrlResolvedEntry>> {
  const resolved: Record<string, ReadUrlResolvedEntry> = {};

  if (provider === null || !provider.isEnabled()) {
    for (const item of parsed) {
      resolved[item.originalUrl] = {
        error: "Failed to generate read token: Storage is not enabled",
      };
    }
    return resolved;
  }

  for (const item of parsed) {
    resolved[item.originalUrl] = await resolvePrivateReadUrl(provider, item);
  }

  return resolved;
}

async function resolvePrivateReadUrl(
  provider: IStorageProvider,
  item: ParsedReadUrl,
): Promise<ReadUrlResolvedEntry> {
  try {
    const query = await provider.generateReadTokenQuery(
      item.containerName,
      item.blobName,
    );

    return {
      url: appendStorageReadQuery(item.originalUrl, query),
    };
  } catch (error) {
    return {
      error: `Failed to generate read token: ${getReadTokenErrorMessage(error)}`,
    };
  }
}

function getReadTokenErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to generate read token";
}
