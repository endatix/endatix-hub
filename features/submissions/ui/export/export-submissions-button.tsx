"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { Download } from "lucide-react";
import { useState } from "react";

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

      // Get content info from response headers
      const contentDisposition =
        response.headers.get("Content-Disposition") || "";
      let filename = `form-${formId}-submissions.csv`;

      // Try to extract filename from Content-Disposition header
      const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
        contentDisposition,
      );
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }

      // Create blob from response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      window.URL.revokeObjectURL(url);

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
