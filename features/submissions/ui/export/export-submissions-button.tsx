"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { Download } from "lucide-react";
import { useState } from "react";
import { getFilenameFromContentDisposition, initiateFileDownload } from "@/lib/utils/files-download";

interface ExportSubmissionsButtonProps {
  formId: string;
  className?: string;
}

export const ExportSubmissionsButton = ({
  formId,
  className,
}: ExportSubmissionsButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Notify user immediately that export is starting
      toast.info({
        title: "Starting export",
        description: "Preparing your file for download...",
      });

      // Use fetch to track the request status
      const exportUrl = `/api/forms/${formId}/export?format=csv`;

      const response = await fetch(exportUrl);

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const filename = getFilenameFromContentDisposition(
        response.headers,
        `form-${formId}-submissions.csv`,
      );

      // Create blob from response and trigger download
      const blob = await response.blob();
      initiateFileDownload(blob, filename);

      // Now we can safely show success message
      toast.success({
        title: "Export successful",
        description: "Your file has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error({
        title: "Export failed",
        description:
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "There was a problem exporting the submissions.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <Spinner className="h-4 w-4 mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isExporting ? "Exporting..." : "Export Submissions"}
    </Button>
  );
};
