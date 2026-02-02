import { DownloadSubmissionFileButton } from "@/features/asset-storage/use-cases/download-user-file/download-submission-file-button";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function hasShowableString(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function hasShowableSize(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

interface FileViewMetaProps {
  originalFileName?: string;
  questionName?: string;
  sizeInBytes?: number;
  downloadApiUrl: string;
  displayName: string;
}

export function FileViewMeta({
  originalFileName,
  questionName,
  sizeInBytes,
  downloadApiUrl,
  displayName,
}: FileViewMetaProps) {
  const showOriginalName = hasShowableString(originalFileName);
  const showQuestionName = hasShowableString(questionName);
  const showSize = hasShowableSize(sizeInBytes);
  const hasMeta = showOriginalName || showQuestionName || showSize;

  return (
    <div className="flex flex-col gap-2 border-t pt-4 text-sm">
      {hasMeta && (
        <dl className="grid gap-1 text-muted-foreground">
          {showOriginalName && (
            <div>
              <dt className="sr-only">Original file name</dt>
              <dd>
                <span className="font-medium text-foreground">
                  Original name:
                </span>{" "}
                {originalFileName!.trim()}
              </dd>
            </div>
          )}
          {showQuestionName && (
            <div>
              <dt className="sr-only">Question</dt>
              <dd>
                <span className="font-medium text-foreground">Question:</span>{" "}
                {questionName!.trim()}
              </dd>
            </div>
          )}
          {showSize && (
            <div>
              <dt className="sr-only">File size</dt>
              <dd>
                <span className="font-medium text-foreground">Size:</span>{" "}
                {formatFileSize(sizeInBytes!)}
              </dd>
            </div>
          )}
        </dl>
      )}
      <div>
        <DownloadSubmissionFileButton
          downloadApiUrl={downloadApiUrl}
          variant="outline"
          size="sm"
          className="gap-2"
        />
      </div>
    </div>
  );
}
