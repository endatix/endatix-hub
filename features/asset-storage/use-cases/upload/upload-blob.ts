import { BlockBlobClient } from "@azure/storage-blob";
import type { BlobUploadOptions } from "../../types";

/** Uploads files to a SAS blob URL and returns the base URL (without query). */
export async function uploadBlob(
  sasUrl: string,
  data: ArrayBuffer,
  options: BlobUploadOptions,
): Promise<string> {
  const client = new BlockBlobClient(sasUrl);
  await client.uploadData(data, {
    metadata: options.metadata,
    blobHTTPHeaders: options.blobHTTPHeaders,
    onProgress: (progress) => {
      const progressPercentage = Math.round(
        (progress.loadedBytes / data.byteLength) * 100,
      );
      console.debug(
        `Upload of ${options.metadata.fileName} is ${progressPercentage}% complete`,
      );
    },
  });

  return sasUrl.split("?").at(0) ?? sasUrl;
}

export type ResizeResult = {
  buffer: ArrayBuffer;
  contentType: string;
  fileState: "original" | "optimized";
};

/** Resizes image via API or returns original buffer on failure.
 * @param file - The file to resize.
 * @param resizeUrl - The URL to resize the file.
 * @returns The resized file.
 */
export async function resizeImageOrFallback(
  file: File,
  resizeUrl: string,
): Promise<ResizeResult> {
  if (!file.type.startsWith("image/")) {
    const buffer = await file.arrayBuffer();
    return {
      buffer,
      contentType: file.type || "application/octet-stream",
      fileState: "original",
    };
  }
  const formData = new FormData();
  formData.append("file", file);

  const resizeResponse = await fetch(resizeUrl, {
    method: "POST",
    body: formData,
  });

  if (!resizeResponse.ok) {
    const errData = (await resizeResponse.json().catch(() => ({}))) as {
      detail?: string;
      error?: string;
    };
    const message =
      errData.detail ??
      errData.error ??
      (resizeResponse.statusText || "Resize failed");
    throw new Error(message);
  }
  const buffer = await resizeResponse.arrayBuffer();
  const contentType = resizeResponse.headers.get("Content-Type") ?? file.type;

  return { buffer, contentType, fileState: "optimized" };
}
