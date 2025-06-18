import { toast } from "@/components/ui/toast";
import {
  getFilenameFromContentDisposition,
  initiateFileDownload,
} from "@/lib/utils/files-download";
import { FolderDown, FolderX } from "lucide-react";

export async function downloadSubmissionFilesUseCase({
  formId,
  submissionId,
}: {
  formId: string;
  submissionId: string;
}) {
  const toastId = `download-toast-${submissionId}`;
  toast.info({
    title: "Preparing download...",
    description: "Your download will start in a few seconds.",
    id: toastId,
    duration: 0
  });
  try {
    const response = await fetch(
      `/api/forms/${formId}/submissions/${submissionId}/files`,
    );

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Download failed: ${errorMessage}`);
    }

    const emptyFileHeader = response.headers.get("x-endatix-empty-file");
    if (emptyFileHeader) {
      toast.warning({
        id: toastId,
        title: "No files to download",
        description: "This submission has no files to download.",
        SvgIcon: FolderX,
        duration: 1000,
      });
      return;
    }
    const filename = getFilenameFromContentDisposition(
      response.headers,
      `submission-${submissionId}-files.zip`,
    );

    const blob = await response.blob();
    initiateFileDownload(blob, filename);

    toast.success({
      id: toastId,
      title: "Download ready!",
      description: "Check your downloads folder.",
      SvgIcon: FolderDown,
      duration: 1000,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      toast.error({ title: err.message, id: toastId });
    } else {
      toast.error({ title: "Failed to download files", id: toastId });
    }
  }
}
