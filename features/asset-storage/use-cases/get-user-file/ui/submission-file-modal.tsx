"use client";

import { Result } from "@/lib/result";
import { FileModal } from "./file-modal";
import { SubmissionFileView } from "./submission-file-view";
import type { UserFileViewData } from "../get-use-file.use-case";
import type { FileViewSize } from "@/features/submissions/ui/answers/file-viewer";

export interface SubmissionFileModalProps {
  fileResult: Result<UserFileViewData>;
  formId: string;
  submissionId: string;
  size?: FileViewSize;
}

const DEFAULT_ERROR_MESSAGE = "File could not be loaded.";

/**
 * Renders the intercepting-route modal for a single submission file.
 * Shows error message or SubmissionFileView inside FileModal.
 * @param size - Size variant for the file view. Default: medium (optimized for modal).
 */
export function SubmissionFileModal({
  fileResult,
  formId,
  submissionId,
  size = "medium",
}: Readonly<SubmissionFileModalProps>) {
  if (Result.isError(fileResult)) {
    return (
      <FileModal>
        <div className="py-4 text-center text-sm text-muted-foreground">
          {fileResult.message || DEFAULT_ERROR_MESSAGE}
        </div>
      </FileModal>
    );
  }

  return (
    <FileModal>
      <SubmissionFileView
        file={fileResult.value}
        formId={formId}
        submissionId={submissionId}
        showBackLink={false}
        size={size}
      />
    </FileModal>
  );
}
