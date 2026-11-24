import {
  buildReportingExportUrl,
  type SubmissionExportListFilters,
} from "../export-url";
import type { TenantExportOption } from "./map-tenant-export-options";
import { FILE_KINDS } from "@/lib/file-kinds";
import { getReportingExportWire } from "@/lib/endatix-api/reporting/reporting-export-wire";
import { getFilenameFromContentDisposition } from "@/lib/utils/files-download";
import { readExportErrorMessage } from "../export-error-message";

export type AttachmentSelection = {
  url: string;
  filename: string;
  formatKey: string;
};
export type ReceivedAttachment = { filename: string; blob: Blob };
const INVALID_FILE =
  "The export did not return a complete file for this selection.";

export function retainedAttachmentSelection(
  formId: string,
  selected: TenantExportOption | undefined,
  filters: SubmissionExportListFilters,
) {
  if (!selected) return null;
  return {
    url: buildReportingExportUrl({ formId, ...selected, listFilters: filters }),
    formatKey: selected.formatKey,
    filename: `form-${formId}-submissions.${selected.fallbackExtension}`,
  };
}

function isSelectedAttachment(response: Response, formatKey: string) {
  const wire = getReportingExportWire(formatKey);
  const media = response.headers
    .get("Content-Type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  return (
    wire &&
    response.status === 200 &&
    !response.redirected &&
    /^attachment\s*;/i.test(disposition) &&
    media === FILE_KINDS[wire.fileKind].mimeType
  );
}

export async function receiveRetainedAttachment(
  selection: AttachmentSelection,
  signal: AbortSignal,
  request = fetch,
): Promise<ReceivedAttachment> {
  const response = await request(selection.url, {
    signal,
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error(await readExportErrorMessage(response));
  if (!isSelectedAttachment(response, selection.formatKey))
    throw new Error(INVALID_FILE);
  return readAttachment(response, selection.filename);
}

async function readAttachment(response: Response, fallbackName: string) {
  const blob = await response.blob();
  const length = response.headers.get("Content-Length");
  if (
    !blob.size ||
    (length !== null &&
      !response.headers.has("Content-Encoding") &&
      blob.size !== Number(length))
  )
    throw new Error(INVALID_FILE);
  return {
    blob,
    filename: getFilenameFromContentDisposition(response.headers, fallbackName),
  };
}
