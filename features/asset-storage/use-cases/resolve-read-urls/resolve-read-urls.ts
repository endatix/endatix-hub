import { Result } from "@/lib/result";
import {
  assertHubObjectAccess,
  assertPublicObjectAccess,
  authorizeFormStorageAccess,
  formAccessForbidden,
} from "@/features/form-access/server";
import type {
  HubStorageScope,
  FormStorageAccess,
  FormStorageGateInput,
} from "@/features/form-access/server";
import { appendStorageReadQuery } from "@/features/asset-storage/infrastructure/append-storage-read-query";
import { getActiveStorageProvider } from "@/features/asset-storage/storage-runtime";
import type { IStorageProvider } from "@/features/asset-storage/infrastructure/core/storage-provider.interface";
import {
  parseStorageObjectUrl,
  type ParsedStorageObjectUrl,
} from "@/features/asset-storage/utils";
import type { ClientStorageConfig } from "@endatix/storage-core";
import { collectRichTextImageSources } from "./rich-text-image-sources";
import { canonicalContentImage } from "../view-protected-files/canonical-content-image";
import { getActiveFormDefinition } from "@/services/api";

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
  originalUrl: string,
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
interface PublicReadBatch {
  richTextImages?: true;
  gate: FormStorageGateInput;
  hubAccessToken?: string;
  urls: string[];
  clientConfig: ClientStorageConfig;
}

export async function resolvePublicReadUrls(input: PublicReadBatch): Promise<Result<ReadUrlsResponse>> {
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

  return resolveAuthorizedReadBatch(input, access);
}

async function resolveAuthorizedReadBatch(input: PublicReadBatch, access: FormStorageAccess) {
  const accessForPaths = {
    ...access,
    submissionId: access.submissionId ?? input.gate.submissionId,
  };

  const sources = input.richTextImages ? await loadRichTextSources(access) : undefined;
  return resolvePresignedReadUrls({
    urls: input.urls,
    clientConfig: input.clientConfig,
    assertObject: (parsed, url) =>
      assertPublicObjectAccess(parsed, accessForPaths, input.clientConfig) ??
      assertReferencedImage(sources, url, input.clientConfig),
  });
}

function assertReferencedImage(sources: Set<string> | undefined, url: string, config: ClientStorageConfig) {
  if (!sources) return null;
  return canonicalContentImage(url, config) && sources.has(url) ? null : "Image is not in the form definition";
}

async function loadRichTextSources(access: { formId: string; definitionJson?: string | null }) {
  try {
    const json = access.definitionJson === undefined
      ? (await getActiveFormDefinition(access.formId, true)).jsonData
      : access.definitionJson;
    return json ? collectRichTextImageSources(JSON.parse(json)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
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

    const accessError = assertObject(located, url);
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
