import { Result } from "@/lib/result";
import type { FileMetadata } from "../../types";
import { toBlobUploadOptions } from "../../infrastructure/blob-metadata-parser";
import { uploadBlob, resizeImageOrFallback } from "./upload-blob";
import { processUploadError, UploadBlockedError } from "./upload-errors";

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB

/**
 * The data returned from the upload URLs endpoint.
 */
export interface UploadUrlsData {
  sasTokens: Record<
    string,
    { success: boolean; url?: string; message?: string }
  >;
  submissionId?: string;
  userId?: string;
  uploadMetadata?: {
    userId: string;
    itemId: string;
    contentItemType: string;
    questionName: string;
  };
}

export type ProcessAndUploadSuccess = { url: string; file: File };

/**
 * Fetches upload URLs from the given endpoint.
 *
 * @param endpoint - The endpoint to fetch the upload URLs from.
 * @param body - The body to send to the endpoint.
 * @returns A Result containing the upload URLs or an error message.
 */
export async function fetchUploadUrls(
  endpoint: string,
  body: unknown,
): Promise<Result<UploadUrlsData>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as UploadUrlsData & {
      detail?: string;
      error?: string;
    };

    if (!response.ok) {
      const message =
        data.detail ?? data.error ?? "Failed to generate upload URLs";
      return Result.error(message);
    }

    return Result.success(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate upload URLs";
    return Result.error(message);
  }
}

/**
 * Resizes image if applicable, then uploads to the SAS URL.
 *
 * @param file - The file to upload.
 * @param sasUrl - The URL to upload the file to.
 * @param meta - The metadata for the file.
 * @param resizeUrl - The URL to resize the file.
 * @returns A Result containing the URL of the uploaded file or an error message.
 */
export async function processAndUploadFile(
  file: File,
  sasUrl: string,
  meta: FileMetadata,
  resizeUrl?: string,
): Promise<Result<ProcessAndUploadSuccess>> {
  try {
    const shouldResize =
      resizeUrl !== undefined &&
      file.type.startsWith("image/") &&
      file.size < LARGE_FILE_THRESHOLD;

    let buffer: ArrayBuffer;
    let contentType: string;
    let fileState: "original" | "optimized";

    if (shouldResize) {
      const out = await resizeImageOrFallback(file, resizeUrl);
      buffer = out.buffer;
      contentType = out.contentType;
      fileState = out.fileState;
    } else {
      buffer = await file.arrayBuffer();
      contentType = file.type || "application/octet-stream";
      fileState = "original";
    }

    const uploadMeta: FileMetadata = {
      ...meta,
      contentType,
      fileState,
    };
    const options = toBlobUploadOptions(uploadMeta);
    const url = await uploadBlob(sasUrl, buffer, options);
    return Result.success({ url, file });
  } catch (err) {
    const errorMessage = processUploadError(err, sasUrl);
    return Result.error(errorMessage);
  }
}
