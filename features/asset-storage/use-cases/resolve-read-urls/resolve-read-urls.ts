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
import { generateReadTokenQuery } from "@/features/asset-storage/infrastructure/storage-gateway";
import {
  parseStorageObjectUrl,
  type ParsedStorageObjectUrl,
} from "@/features/asset-storage/infrastructure/providers/shared/storage-url-parse";
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

async function resolvePresignedReadUrls(input: {
  urls: string[];
  clientConfig: ClientStorageConfig;
  assertObject: (parsed: ParsedStorageObjectUrl) => string | null;
}): Promise<Result<ReadUrlsResponse>> {
  const { urls, clientConfig, assertObject } = input;

  if (!clientConfig.isEnabled) {
    return Result.validationError("Storage is not enabled");
  }

  if (!clientConfig.hostName) {
    return Result.validationError(
      "read-urls requires storage hostname configuration (Azure or S3)",
    );
  }

  const resolved: Record<string, ReadUrlResolvedEntry> = {};

  if (!clientConfig.isPrivate) {
    for (const url of urls) {
      resolved[url] = { url };
    }
    return Result.success({ resolved });
  }

  const parsed: ParsedReadUrl[] = [];

  for (const url of urls) {
    const located = parseStorageObjectUrl(url, clientConfig);
    if (located === null) {
      resolved[url] = {
        error: "URL does not match configured storage",
      };
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

  for (const item of parsed) {
    const tokenResult = await generateReadTokenQuery(
      item.containerName,
      item.blobName,
    );

    if (Result.isError(tokenResult)) {
      resolved[item.originalUrl] = {
        error: `Failed to generate read token: ${tokenResult.message}`,
      };
      continue;
    }

    resolved[item.originalUrl] = {
      url: appendStorageReadQuery(item.originalUrl, tokenResult.value),
    };
  }

  return Result.success({ resolved });
}
