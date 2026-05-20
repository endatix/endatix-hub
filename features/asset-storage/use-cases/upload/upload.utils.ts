import { Result } from "@/lib/result";
import type { ProcessedState } from "../../types";
import type { UploadUrlDescriptor } from "../../infrastructure/core";
import { uploadBlob, resizeImageOrFallback } from "./upload-blob";
import { processUploadError } from "./upload-errors";

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Response(file).arrayBuffer();
}

/** Per-file result from upload-urls / content/upload-urls (PR2 contract). */
export type UploadUrlEntry = UploadUrlDescriptor | { error: string };

/**
 * The data returned from the upload URLs endpoint.
 */
export interface UploadUrlsData {
  uploads: Record<string, UploadUrlEntry>;
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

export type PreparedUploadBytes = {
  file: File;
  buffer: ArrayBuffer;
  contentType: string;
  fileState: ProcessedState;
};

/**
 * Reads the file (or resizes images under the threshold) so MIME and bytes match
 * what the server will embed in {@link UploadUrlDescriptor.headers}.
 */
export async function prepareUploadBytes(
  file: File,
  resizeUrl: string | undefined,
): Promise<PreparedUploadBytes> {
  const shouldResize =
    resizeUrl !== undefined &&
    file.type.startsWith("image/") &&
    file.size < LARGE_FILE_THRESHOLD;

  if (shouldResize) {
    const out = await resizeImageOrFallback(file, resizeUrl);
    return {
      file,
      buffer: out.buffer,
      contentType: out.contentType,
      fileState: out.fileState,
    };
  }

  const buffer = await readFileAsArrayBuffer(file);
  return {
    file,
    buffer,
    contentType: file.type || "application/octet-stream",
    fileState: "original",
  };
}

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
 * PUTs prepared bytes using only server-supplied {@link UploadUrlDescriptor.headers}
 */
export async function processAndUploadFile(
  file: File,
  descriptor: UploadUrlDescriptor,
  buffer: ArrayBuffer,
): Promise<Result<ProcessAndUploadSuccess>> {
  try {
    const url = await uploadBlob(descriptor.url, buffer, descriptor.headers);
    return Result.success({ url, file });
  } catch (err) {
    return Result.error(processUploadError(err));
  }
}
