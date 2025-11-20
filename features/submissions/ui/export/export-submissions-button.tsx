"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { Download, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { getFilenameFromContentDisposition, initiateFileDownload } from "@/lib/utils/files-download";
import { getTenantSettingsAction } from "@/features/forms/application/actions/get-tenant-settings.action";
import type { CustomExportSettings } from "@/lib/endatix-api/tenant";
import { Result } from "@/lib/result";

interface ExportSubmissionsButtonProps {
  formId: string;
  className?: string;
}

export const ExportSubmissionsButton = ({
  formId,
  className,
}: ExportSubmissionsButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [customExports, setCustomExports] = useState<CustomExportSettings[]>([]);
  const [currentExportName, setCurrentExportName] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        const result = await getTenantSettingsAction();

        if (Result.isSuccess(result)) {
          if (result.value.customExports) {
            setCustomExports(result.value.customExports);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tenant settings:", error);
        // Silently fail - will show simple button
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchTenantSettings();
  }, []);

  const handleExport = async (exportId?: number, exportName?: string) => {
    try {
      setIsExporting(true);
      setCurrentExportName(exportName || null);

      // Notify user immediately that export is starting
      toast.info({
        title: "Starting export",
        description: "Preparing your file for download...",
      });

      // Build export URL with optional exportId
      const exportUrl = exportId
        ? `/api/forms/${formId}/export?format=csv&exportId=${exportId}`
        : `/api/forms/${formId}/export?format=csv`;

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
      setCurrentExportName(null);
    }
  };

  // Show loading state while fetching settings
  if (isLoadingSettings) {
    return (
      <Button
        variant="outline"
        disabled
        className={className}
      >
        <Spinner className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  // If no custom exports, show simple button
  if (customExports.length === 0) {
    return (
      <Button
        variant="outline"
        onClick={() => handleExport()}
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
  }

  // Show dropdown menu button when custom exports exist
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isExporting}
          className={className}
        >
          {isExporting && !currentExportName ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting && !currentExportName ? "Exporting..." : "Export Submissions"}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleExport()}
            disabled={isExporting}
          >
            {isExporting && !currentExportName ? (
              <Spinner className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Default CSV Export
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {customExports.map((exportOption) => (
            <DropdownMenuItem
              key={exportOption.id}
              onClick={() => handleExport(exportOption.id, exportOption.name)}
              disabled={isExporting}
            >
              {isExporting && currentExportName === exportOption.name ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exportOption.name}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
