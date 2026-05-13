import { throwUploadError } from "./upload-errors";

/**
 * Uploads bytes to a presigned blob URL via `fetch` PUT (no Azure SDK on the client).
 * @param uploadUrl - Full URL including SAS or presigned query string.
 * @param data - Raw file bytes.
 * @param headers - Merged provider base headers + {@link toAzureBlockBlobPutHeaders} (or S3 equivalent).
 */
export async function uploadBlob(
  uploadUrl: string,
  data: ArrayBuffer,
  headers: Record<string, string>,
): Promise<string> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: data,
      headers,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const detail = text || response.statusText || `HTTP ${response.status}`;
      throw new Error(`Blob upload failed: ${detail}`);
    }
  } catch (err) {
    const fileUrl = uploadUrl.split("?").at(0) ?? uploadUrl;
    throwUploadError(err, fileUrl);
  }

  return uploadUrl.split("?").at(0) ?? uploadUrl;
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
