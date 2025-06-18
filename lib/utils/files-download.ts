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

export function initiateFileDownload(blob: Blob, filename: string) : void {
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
