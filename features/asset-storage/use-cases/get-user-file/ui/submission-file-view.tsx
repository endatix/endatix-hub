import {
  FileContentView,
  type FileViewSize,
} from "@/features/submissions/ui/answers/file-viewer";
import { FileViewMeta } from "./file-view-meta";
import { withBasePath } from "@/lib/hosting";
import Link from "next/link";
import type { UserFileViewData } from "../get-use-file.use-case";
import type { UrlObject } from "node:url";

export interface SubmissionFileViewProps {
  file: UserFileViewData;
  formId: string;
  submissionId: string;
  showBackLink?: boolean;
  /** Name + type under the preview. Off inside a panel whose header already shows them. */
  showCaption?: boolean;
  /** Name the enclosing dialog shows as its title (see FileViewMeta). */
  shownName?: string;
  size?: FileViewSize;
}

/**
 * Renders the file view for a single submission file.
 * Shows the file content and metadata.
 * @param size - Size variant for the file view. Default: large (optimized for full page).
 */
export function SubmissionFileView({
  file,
  formId,
  submissionId,
  showBackLink = true,
  showCaption = true,
  shownName,
  size = "large",
}: Readonly<SubmissionFileViewProps>) {
  const filesListHref: UrlObject = {
    pathname: `/forms/${formId}/submissions/${submissionId}/files`,
    query: {},
  };
  const downloadApiUrl = withBasePath(
    `/api/hub/v0/storage/submission-files/${formId}/${submissionId}/${encodeURIComponent(file.displayName)}/download-url`,
  );

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
        size={size}
        showCaption={showCaption}
      />
      <FileViewMeta
        originalFileName={file.originalFileName}
        questionName={file.questionName}
        sizeInBytes={file.sizeInBytes}
        downloadApiUrl={downloadApiUrl}
        displayName={file.displayName}
        shownName={shownName}
        openUrl={file.url}
      />
    </div>
  );
}
