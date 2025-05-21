"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { COLUMNS_DEFINITION, DataTable } from "@/features/submissions/ui/table";
import { Submission } from "@/types";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type SubmissionsTableProps = {
  data: Submission[];
  formId: string;
};

const SubmissionsTable = ({ data, formId }: SubmissionsTableProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);

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
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      let filename = `form-${formId}-submissions.csv`;
      
      // Try to extract filename from Content-Disposition header
      const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSubmissionId) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedSubmissionId(null); // Deselect
        return;
      }

      const currentIndex = data.findIndex((s) => s.id === selectedSubmissionId);
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : data.length - 1;
        setSelectedSubmissionId(data[prevIndex].id);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        const nextIndex = currentIndex < data.length - 1 ? currentIndex + 1 : 0;
        setSelectedSubmissionId(data[nextIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedSubmissionId, data]);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? "Exporting..." : "Export Submissions"}
        </Button>
      </div>
      <DataTable data={data} columns={COLUMNS_DEFINITION} />
    </>
  );
};

export default SubmissionsTable;
