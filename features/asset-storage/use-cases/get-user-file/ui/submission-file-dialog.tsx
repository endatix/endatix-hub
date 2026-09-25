"use client";

import { Spinner } from "@/components/loaders/spinner";
import { useAssetStorage } from "@/features/asset-storage/ui/asset-storage.context";
import { usePrivateStorageDisplayUrl } from "@/features/asset-storage/ui/use-resolved-private-storage-url";
import { parseSubmissionFileUrl } from "@/features/asset-storage/utils";
import { FileContentView } from "@/features/submissions/ui/answers/file-viewer";
import { withBasePath } from "@/lib/hosting";
import type { IFile } from "@/lib/questions/file/file-type";
import { useEffect, useMemo, useState } from "react";
import type { UserFileViewData } from "../get-use-file.use-case";
import { FilePreviewDialog } from "./file-preview-dialog";
import { SubmissionFileView } from "./submission-file-view";

export interface SubmissionFileDialogProps {
  /** The file-question value entry to show. Kept while closing so the exit animation has content. */
  file: IFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: UserFileViewData }
  | { status: "unavailable" };

/**
 * Details dialog for one uploaded file on the submission details page.
 * Every open fetches a freshly signed URL plus the stored metadata, so a page
 * left open past the read-token lifetime never hands the reader a dead link.
 * Files outside submission storage (inline data, external URLs) fall back to a
 * plain preview without metadata.
 */
export function SubmissionFileDialog({
  file,
  open,
  onOpenChange,
}: Readonly<SubmissionFileDialogProps>) {
  // A new session per open remounts the body, so reopening the same file signs again.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSession((current) => current + 1);
    }
  }

  return (
    <FilePreviewDialog
      open={open}
      onOpenChange={onOpenChange}
      title={file?.name}
      description={file?.type}
    >
      {file && (
        <SubmissionFileDialogBody
          key={`${session}:${file.content}`}
          file={file}
        />
      )}
    </FilePreviewDialog>
  );
}

function SubmissionFileDialogBody({ file }: Readonly<{ file: IFile }>) {
  const { config } = useAssetStorage();
  const ref = useMemo(
    () => parseSubmissionFileUrl(file.content ?? "", config),
    [file.content, config],
  );
  const viewDataUrl = ref
    ? withBasePath(
        `/api/hub/v0/storage/submission-files/${encodeURIComponent(ref.formId)}/${encodeURIComponent(ref.submissionId)}/${encodeURIComponent(ref.fileName)}`,
      )
    : null;
  const [state, setState] = useState<LoadState>(
    viewDataUrl ? { status: "loading" } : { status: "unavailable" },
  );

  useEffect(() => {
    if (!viewDataUrl) {
      return;
    }

    const controller = new AbortController();

    fetch(viewDataUrl, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`File details request failed: ${response.status}`);
        }
        const data = (await response.json()) as UserFileViewData;
        setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setState({ status: "unavailable" });
      });

    return () => controller.abort();
  }, [viewDataUrl]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "ready" && ref) {
    return (
      <SubmissionFileView
        file={state.data}
        formId={ref.formId}
        submissionId={ref.submissionId}
        showBackLink={false}
        showCaption={false}
        shownName={file.name ?? state.data.displayName}
        size="medium"
      />
    );
  }

  return <UnmanagedFilePreview file={file} />;
}

/** Preview for a file the Hub cannot look up in submission storage. */
function UnmanagedFilePreview({ file }: Readonly<{ file: IFile }>) {
  const { displayUrl, isResolving } = usePrivateStorageDisplayUrl(file.content);

  if (isResolving) {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <FileContentView
      src={displayUrl}
      contentType={file.type}
      name={file.name}
      size="medium"
      showCaption={false}
    />
  );
}
