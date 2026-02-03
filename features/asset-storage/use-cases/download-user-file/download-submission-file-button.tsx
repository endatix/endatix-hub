"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { initiateFileDownload } from "@/lib/utils/files-download";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";

interface DownloadUrlResponse {
  url: string;
  fileName: string;
  contentType?: string;
}

interface DownloadSubmissionFileButtonProps {
  downloadApiUrl: string;
  children?: React.ReactNode;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function DownloadSubmissionFileButton({
  downloadApiUrl,
  children,
  variant = "outline",
  size = "sm",
  className,
}: Readonly<DownloadSubmissionFileButtonProps>) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(downloadApiUrl);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail ?? "Failed to get download URL",
        );
      }

      const data = (await response.json()) as DownloadUrlResponse;
      const { url, fileName } = data;

      const blobRes = await fetch(url);
      if (!blobRes.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await blobRes.blob();
      initiateFileDownload(blob, fileName);

      toast.success({
        title: "File downloaded",
        description: "The file has been downloaded to your downloads folder.",
      });
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        toast.error({
          title: "Could not download file",
          description: err.message ?? "Please try again later.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [downloadApiUrl]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
      aria-label={loading ? "Preparing download…" : "Download"}
    >
      <Download className="h-4 w-4" />
      {children ?? "Download"}
    </Button>
  );
}
