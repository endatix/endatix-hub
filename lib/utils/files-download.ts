const CONTENT_DISPOSITION_HEADER = "Content-Disposition";
export const EMPTY_FILE_HEADER = "x-endatix-empty-file";

export function getFilenameFromContentDisposition(
  headers: Headers,
  defaultFilename: string,
) {
  if (!headers) {
    return defaultFilename;
  }

  const contentDisposition = headers.get(CONTENT_DISPOSITION_HEADER) || "";

  if (!contentDisposition) {
    return defaultFilename;
  }

  let filename = defaultFilename;

  const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
    contentDisposition,
  );

  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1].replace(/['"]/g, "");
  }

  return filename;
}

export function initiateFileDownload(blob: Blob, filename: string): void {
  if (!blob || !filename) {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  window.URL.revokeObjectURL(url);
}

/** A download the server refused; `message` is its reason, fit to show the reader. */
export class DownloadError extends Error {}

type UrlDownload = {
  fallbackFilename: string;
  /** The reader-facing reason from a failed response (its JSON `error`, or a fallback). */
  readError: (response: Response) => Promise<string>;
  fetchFn?: typeof fetch;
};

/**
 * Fetches a file the server builds and saves it under the server's file name. A refused request
 * throws `DownloadError` with the server's reason; a network failure throws as `fetch` does.
 */
export async function downloadFromUrl(
  url: string,
  { fallbackFilename, readError, fetchFn = fetch }: UrlDownload,
): Promise<string> {
  const response = await fetchFn(url);
  if (!response.ok) throw new DownloadError(await readError(response));
  const filename = getFilenameFromContentDisposition(
    response.headers,
    fallbackFilename,
  );
  initiateFileDownload(await response.blob(), filename);
  return filename;
}

/** Saves text the page already holds (a CSV built in the browser) as a UTF-8 file. */
export function downloadText(
  text: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  initiateFileDownload(blob, filename);
}
