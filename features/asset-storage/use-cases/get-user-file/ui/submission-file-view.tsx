import { FileContentView } from "@/features/submissions/ui/answers/file-viewer";
import { FileViewMeta } from "@/features/submissions/ui/files/file-view-meta";
import Link from "next/link";
import type { UserFileViewData } from "../get-use-file.use-case";
import { UrlObject } from "url";

export interface SubmissionFileViewProps {
  file: UserFileViewData;
  formId: string;
  submissionId: string;
  /** Show "Back to files" link. Default true for full page, false for modal. */
  showBackLink?: boolean;
  /** Aspect ratio for image/video. Default "square". */
  aspectRatio?: "portrait" | "square";
}

export function SubmissionFileView({
  file,
  formId,
  submissionId,
  showBackLink = true,
  aspectRatio = "square",
}: SubmissionFileViewProps) {
  const filesListHref: UrlObject = {
    pathname: `/forms/${formId}/submissions/${submissionId}/files`,
    query: {},
  };
  const downloadApiUrl = `/api/hub/v0/storage/submission-files/${formId}/${submissionId}/${encodeURIComponent(file.displayName)}/download-url`;

  return (
    <div className="space-y-4">
      {showBackLink && (
        <div className="flex items-center gap-4">
          <Link
            href={filesListHref}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to files
          </Link>
        </div>
      )}
      <FileContentView
        src={file.url}
        contentType={file.contentType}
        name={file.displayName}
        aspectRatio={aspectRatio}
      />
      <FileViewMeta
        originalFileName={file.originalFileName}
        questionName={file.questionName}
        downloadApiUrl={downloadApiUrl}
        displayName={file.displayName}
      />
    </div>
  );
}
