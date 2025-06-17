import { toast } from "@/components/ui/toast";
import { FolderDown } from "lucide-react";

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
    id: toastId
  });
  try {
    const res = await fetch(
      `/api/forms/${formId}/submissions/${submissionId}/files`,
    );
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition");
    let filename = "submission-files.zip";
    if (disposition) {
      const match = disposition.match(/filename="?([^\"]+)"?/);
      if (match) filename = match[1];
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success({
      id: toastId,
      title: "Download ready!",
      description: "Check your downloads folder.",
      SvgIcon: FolderDown,
      duration: 1000
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      toast.error({ title: err.message, id: toastId });
    } else {
      toast.error({ title: "Failed to download files", id: toastId });
    }
  }
}
