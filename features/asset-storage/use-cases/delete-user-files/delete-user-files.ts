import { requireActiveStorageProvider } from "@/features/asset-storage/storage-runtime";
import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import {
  getLastSegmentFromUrlPath,
  parseStorageObjectUrl,
  type ParsedStorageObjectUrl,
} from "@/features/asset-storage/utils";

export type DeleteUserFileResult =
  | { fileUrl: string; result: "success" }
  | { fileUrl: string; result: "error"; error: string };

export interface DeleteUserFilesInput {
  fileUrls: string[];
  clientConfig: ClientStorageConfig;
  assertObject: (parsed: ParsedStorageObjectUrl) => string | null;
}

/**
 * Deletes user-files blobs after URL parse, container check, and path assert.
 */
export async function deleteUserFiles(
  input: DeleteUserFilesInput,
): Promise<DeleteUserFileResult[]> {
  const { fileUrls, clientConfig, assertObject } = input;

  return Promise.all(
    fileUrls.map(async (fileUrl): Promise<DeleteUserFileResult> => {
      try {
        const parsed = parseStorageObjectUrl(fileUrl, clientConfig);
        if (parsed === null) {
          return {
            fileUrl,
            result: "error",
            error: "File URL does not match configured storage",
          };
        }

        if (parsed.containerName !== clientConfig.containerNames.USER_FILES) {
          return {
            fileUrl,
            result: "error",
            error: "File is not in the user-files container",
          };
        }

        const scopeError = assertObject(parsed);
        if (scopeError !== null) {
          return {
            fileUrl,
            result: "error",
            error: scopeError,
          };
        }

        const fileName = getLastSegmentFromUrlPath(parsed.blobName);
        if (!fileName) {
          return {
            fileUrl,
            result: "error",
            error: "Could not extract filename from URL",
          };
        }

        const folderPath = parsed.blobName.slice(
          0,
          parsed.blobName.length - fileName.length - 1,
        );

        await requireActiveStorageProvider().deleteBlob({
          containerName: parsed.containerName,
          fileName,
          folderPath,
        });

        return { fileUrl, result: "success" };
      } catch (error) {
        return {
          fileUrl,
          result: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
  );
}
