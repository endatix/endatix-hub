"use client";

import { Result } from "@/lib/result";
import { FileModal } from "@/features/submissions/ui/files/file-modal";
import { SubmissionFileView } from "./submission-file-view";
import type { UserFileViewData } from "../get-use-file.use-case";

export interface SubmissionFileModalProps {
  /** Result from getUserFile(formId, submissionId, fileName). */
  fileResult: Result<UserFileViewData>;
  formId: string;
  submissionId: string;
  /** Aspect ratio for image/video. Default "square". */
  aspectRatio?: "portrait" | "square";
}

const DEFAULT_ERROR_MESSAGE = "File could not be loaded.";

/**
 * Renders the intercepting-route modal for a single submission file.
 * Shows error message or SubmissionFileView inside FileModal.
 */
export function SubmissionFileModal({
  fileResult,
  formId,
  submissionId,
  aspectRatio = "square",
}: SubmissionFileModalProps) {
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
        aspectRatio={aspectRatio}
      />
    </FileModal>
  );
}
