import { zipSync } from "fflate";
import { appendStorageReadQuery } from "@/features/asset-storage/infrastructure/append-storage-read-query";
import { mapWithConcurrency } from "@/lib/utils/map-with-concurrency";
import { getContainerUrl } from "@endatix/storage-azure";
import { buildUserFilePath } from "@/features/asset-storage/infrastructure/storage-utils";
import { listUserFiles } from "@/features/asset-storage/server";
import {
  getActiveStorageProvider,
  getClientStorageConfig,
} from "@/features/asset-storage/storage-runtime";
import type { UserFileMetadata } from "@/features/asset-storage/types";
import { Result } from "@/lib/result";
import path from "node:path";

const DOWNLOAD_CONCURRENCY = 5;

export type BuildSubmissionFilesZipResult =
  | { kind: "empty" }
  | { kind: "zip"; buffer: Buffer; downloadFileName: string };

export function sanitizeZipEntryName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
}

/**
 * Builds zip entry names aligned with OSS GetFiles (prefix + question name, -N for multiples).
 */
export function buildZipEntryNames(
  files: UserFileMetadata[],
  fileNamesPrefix: string = "",
): Map<UserFileMetadata, string> {
  const byQuestion = new Map<string, UserFileMetadata[]>();

  for (const file of files) {
    const questionKey = file.questionName ?? file.displayName;
    const group = byQuestion.get(questionKey);
    if (group === undefined) {
      byQuestion.set(questionKey, [file]);
    } else {
      group.push(file);
    }
  }

  const entryNames = new Map<UserFileMetadata, string>();
  for (const [questionName, group] of byQuestion) {
    group.forEach((file, index) => {
      let base = `${fileNamesPrefix}${questionName}`;
      if (group.length > 1) {
        base += `-${index + 1}`;
      }
      const ext = path.extname(file.originalFileName || file.displayName || "");
      entryNames.set(file, sanitizeZipEntryName(base) + ext);
    });
  }

  return entryNames;
}

async function fetchBlobBytes(url: string): Promise<Buffer | null> {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Zips submission user-files from blob storage (private or public).
 * Uses provider credentials via read SAS / presigned URLs — not submission JSON URLs.
 */
export async function buildSubmissionFilesZipFromStorage({
  formId,
  submissionId,
  fileNamesPrefix = "",
  downloadFileName,
}: {
  formId: string;
  submissionId: string;
  fileNamesPrefix?: string;
  downloadFileName: string;
}): Promise<Result<BuildSubmissionFilesZipResult>> {
  const clientConfig = getClientStorageConfig();

  if (!clientConfig.isEnabled) {
    return Result.error("Storage is not enabled");
  }

  const listResult = await listUserFiles(formId, submissionId);
  if (Result.isError(listResult)) {
    return Result.error(listResult.message);
  }

  const files = listResult.value;
  if (files.length === 0) {
    return Result.success({ kind: "empty" });
  }

  const containerName = clientConfig.containerNames.USER_FILES;
  const blobNames: string[] = [];
  for (const file of files) {
    const pathResult = buildUserFilePath(
      formId,
      submissionId,
      file.displayName,
    );
    if (Result.isError(pathResult)) {
      return Result.error(pathResult.message);
    }
    blobNames.push(pathResult.value);
  }

  let readTokens: Record<string, string> = {};
  if (clientConfig.isPrivate) {
    const provider = getActiveStorageProvider();
    if (provider === null || !provider.isEnabled()) {
      return Result.error("Storage is not enabled");
    }

    const tokensResult = await provider.bulkGenerateReadTokens({
      containerName,
      resourceType: "file",
      resourceNames: blobNames,
    });
    if (Result.isError(tokensResult)) {
      return Result.error(tokensResult.message);
    }
    readTokens = tokensResult.value.readTokens;
  }

  const baseUrl = getContainerUrl(containerName, clientConfig);
  const entryNames = buildZipEntryNames(files, fileNamesPrefix);
  const zipEntries: Record<string, Uint8Array> = {};

  const downloaded = await mapWithConcurrency(
    files,
    DOWNLOAD_CONCURRENCY,
    async (file) => {
      const pathResult = buildUserFilePath(
        formId,
        submissionId,
        file.displayName,
      );
      if (Result.isError(pathResult)) {
        return null;
      }
      const blobName = pathResult.value;
      let url = `${baseUrl}/${blobName}`;
      const token = readTokens[blobName];
      if (clientConfig.isPrivate && token) {
        url = appendStorageReadQuery(
          url,
          token.startsWith("?") ? token.slice(1) : token,
        );
      }
      const bytes = await fetchBlobBytes(url);
      if (bytes === null) {
        return null;
      }
      const entryName = entryNames.get(file);
      if (entryName === undefined) {
        return null;
      }
      return { entryName, bytes };
    },
  );

  for (const item of downloaded) {
    if (item !== null) {
      zipEntries[item.entryName] = new Uint8Array(item.bytes);
    }
  }

  if (Object.keys(zipEntries).length === 0) {
    return Result.success({ kind: "empty" });
  }

  const zipBuffer = Buffer.from(zipSync(zipEntries));
  return Result.success({
    kind: "zip",
    buffer: zipBuffer,
    downloadFileName,
  });
}
