import type { FileOptions } from "../../core/storage-operation-types";

/** Asserts that storage is enabled. */
export function assertStorageEnabled(
  providerLabel: string,
  isEnabled: boolean,
): void {
  if (!isEnabled) {
    throw new Error(`${providerLabel} storage is not enabled`);
  }
}

/** Asserts that the inputs for generating an upload URL are valid. */
export function assertGenerateUploadUrlInputs(fileOptions: FileOptions): void {
  if (!fileOptions.fileName) {
    throw new Error("a file is not provided");
  }
  if (!fileOptions.folderPath) {
    throw new Error("a folder path is not provided");
  }
  if (!fileOptions.containerName) {
    throw new Error("container name is not provided");
  }
}

/** Asserts that the inputs for deleting a blob are valid. */
export function assertDeleteBlobInputs(fileOptions: FileOptions): void {
  if (!fileOptions.fileName) {
    throw new Error("a file is not provided");
  }

  if (!fileOptions.containerName) {
    throw new Error("container name is not provided");
  }
}
