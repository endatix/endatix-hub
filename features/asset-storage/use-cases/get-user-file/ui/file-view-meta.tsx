import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { Button } from "@/components/ui/button";
import { DownloadSubmissionFileButton } from "@/features/asset-storage/use-cases/download-user-file/download-submission-file-button";
import { ExternalLink, Info } from "lucide-react";

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
  /** The name the surrounding view already shows as its title; rows repeating it are dropped. Default: displayName. */
  shownName?: string;
  /** Signed view URL; rendered as "Open in new tab". Sign it when the view opens, not earlier. */
  openUrl?: string;
}

export function FileViewMeta({
  originalFileName,
  questionName,
  sizeInBytes,
  downloadApiUrl,
  displayName,
  shownName = displayName,
  openUrl,
}: Readonly<FileViewMetaProps>) {
  const showOriginalName =
    hasShowableString(originalFileName) &&
    originalFileName!.trim() !== shownName;
  const showStoredName = displayName !== shownName;
  const showQuestionName = hasShowableString(questionName);
  const showSize = hasShowableSize(sizeInBytes);
  const hasMeta =
    showOriginalName || showStoredName || showQuestionName || showSize;

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <DownloadSubmissionFileButton
        downloadApiUrl={downloadApiUrl}
        variant="outline"
        size="sm"
        className="gap-2"
      />
      {openUrl && (
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <a href={openUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        </Button>
      )}
    </div>
  );

  return (
    <PanelSection icon={Info} title="File details">
      {hasMeta && (
        <dl className="grid gap-2">
          {showOriginalName && (
            <SummaryRow
              label="Original name"
              value={originalFileName!.trim()}
            />
          )}
          {showStoredName && (
            <SummaryRow label="Stored as" value={displayName} />
          )}
          {showQuestionName && (
            <SummaryRow label="Question" value={questionName!.trim()} />
          )}
          {showSize && (
            <SummaryRow label="Size" value={formatFileSize(sizeInBytes!)} />
          )}
        </dl>
      )}
      {actions}
    </PanelSection>
  );
}
