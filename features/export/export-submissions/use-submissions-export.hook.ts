"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { TelemetryLogger } from "@/features/telemetry";
import { getExportFailureMessage } from "../export-error-message";
import { downloadSubmissionsExport } from "./download-submissions-export";

const LOGGER_NAME = "export.submissions-export";

/**
 * Options for running a submissions export.
 * @param exportName - The name of the export.
 * @param fallbackFilename - The fallback filename to use if the export name is not provided.
 * @param url - The URL to download the export from.
 */
interface RunSubmissionsExportOptions {
  exportName?: string | null;
  fallbackFilename: string;
  url: string;
}

/**
 * Hook to manage the state of the submissions export process.
 * @returns An object containing the current export name, whether it is exporting, and a function to run the export.
 */
export function useSubmissionsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [currentExportName, setCurrentExportName] = useState<string | null>(
    null,
  );

  const runExport = async ({
    exportName = null,
    fallbackFilename,
    url,
  }: RunSubmissionsExportOptions): Promise<boolean> => {
    try {
      setIsExporting(true);
      setCurrentExportName(exportName);

      toast.info({
        title: "Starting export",
        description: "Preparing your file for download...",
      });

      await downloadSubmissionsExport(url, fallbackFilename);

      toast.success({
        title: "Export successful",
        description: "Your file has been downloaded successfully.",
      });
      return true;
    } catch (error) {
      TelemetryLogger.error(
        "Submissions export failed",
        undefined,
        {
          "export.has_name": Boolean(exportName?.trim()),
          "export.fallback_filename_length": fallbackFilename.length,
          "error.type": error instanceof Error ? error.name : typeof error,
        },
        LOGGER_NAME,
      );
      toast.error({
        title: "Export failed",
        description: getExportFailureMessage(error),
      });
      return false;
    } finally {
      setIsExporting(false);
      setCurrentExportName(null);
    }
  };

  return { currentExportName, isExporting, runExport };
}
