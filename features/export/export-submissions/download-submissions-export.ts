import {
  getFilenameFromContentDisposition,
  initiateFileDownload,
} from "@/lib/utils/files-download";
import { readExportErrorMessage } from "../export-error-message";

/**
 * Downloads a submissions export from a given URL.
 * @param url - The URL to download the export from.
 * @param fallbackFilename - The fallback filename to use if the export name is not provided.
 * @param fetchFn - The function to use to fetch the export.
 * @returns A promise that resolves when the export is downloaded.
 */
export async function downloadSubmissionsExport(
  url: string,
  fallbackFilename: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchFn(url);

  if (!response.ok) {
    throw new Error(await readExportErrorMessage(response));
  }

  const filename = getFilenameFromContentDisposition(
    response.headers,
    fallbackFilename,
  );

  const blob = await response.blob();
  initiateFileDownload(blob, filename);
}
