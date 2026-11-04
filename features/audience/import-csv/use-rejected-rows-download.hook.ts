"use client";

import { useState } from "react";
import type {
  AudienceImportRejectedRow,
  AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { downloadText } from "@/lib/utils/files-download";
import { listAudienceImportRejectionsAction } from "./audience-import.action";
import {
  REJECTED_ROWS_FILE_MIME,
  rejectedRowsCsv,
  rejectedRowsFileName,
} from "./rejected-rows-file";

const UNREAD = "The rejected rows could not be read. Try again.";
const NONE_KEPT =
  "No rejected rows are kept for this import any more: they are deleted 7 days after it finished.";

/** What the last download said, when it saved no file. */
export type DownloadMessage = { kind: "info" | "error"; text: string };

/** Every rejected row, page by page; the first page that fails stops the read. */
async function readAllRejections(
  formId: string,
  importId: string,
): Promise<Result<AudienceImportRejectedRow[]>> {
  const rows: AudienceImportRejectedRow[] = [];
  for (let page = 1; ; page += 1) {
    const read = await listAudienceImportRejectionsAction({
      formId,
      importId,
      page,
    }).catch(() => Result.error<never>(UNREAD));
    if (Result.isError(read)) return read;
    rows.push(...read.value.items);
    if (!read.value.hasNextPage) return Result.success(rows);
  }
}

function saveRejectedRows(
  view: AudienceImportView,
  rows: readonly AudienceImportRejectedRow[],
) {
  const csv = rejectedRowsCsv(view.headers ?? [], rows);
  const fileName = rejectedRowsFileName(view.fileName);
  downloadText(csv, fileName, REJECTED_ROWS_FILE_MIME);
}

/**
 * E4: the import's rejected rows saved as a dated CSV, each with its line and reason before the
 * file's own cells, so the scripter can find and fix them. No empty file is saved.
 */
export function useRejectedRowsDownload(
  formId: string,
  view: AudienceImportView,
) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<DownloadMessage | null>(null);
  const download = async () => {
    setPending(true);
    setMessage(null);
    const read = await readAllRejections(formId, view.importId);
    setPending(false);
    if (Result.isError(read))
      return setMessage({ kind: "error", text: read.message });
    if (read.value.length === 0)
      return setMessage({ kind: "info", text: NONE_KEPT });
    saveRejectedRows(view, read.value);
  };
  return { pending, message, download };
}
